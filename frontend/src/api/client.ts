// HTTP client mỏng cho backend ProjectHub: gắn JWT, parse JSON, ném lỗi có status.

// Base URL backend — ưu tiên cấu hình RUNTIME (window.__RUNTIME_CONFIG__ do nginx ghi
// từ biến môi trường lúc container khởi động) → đổi IP/port không cần build lại image.
// Fallback: biến build-time VITE_API_BASE, rồi giá trị mặc định cho dev.
declare global {
  interface Window {
    __RUNTIME_CONFIG__?: { API_BASE?: string };
  }
}

const runtimeBase =
  typeof window !== 'undefined' ? window.__RUNTIME_CONFIG__?.API_BASE : undefined;

const BASE: string =
  runtimeBase || (import.meta.env.VITE_API_BASE as string) || 'http://localhost:8000/api/v1';

const TOKEN_KEY = 'projecthub.token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra ?? {}),
  };
}

// #33: FastAPI trả 422 với `detail` là mảng [{ loc, msg, type, ctx }] — trước đây hiện nguyên
// JSON thô. Dịch sang câu tiếng Việt rõ ràng theo trường; trường lạ thì dùng `msg` gốc.
const FIELD_LABEL: Record<string, string> = {
  email: 'Email', password: 'Mật khẩu', name: 'Họ tên', title: 'Tiêu đề',
};

interface ValidationIssue { loc?: (string | number)[]; msg?: string; type?: string; ctx?: Record<string, unknown>; }

function describeIssue(i: ValidationIssue): string {
  const field = [...(i.loc ?? [])].reverse().find(x => typeof x === 'string' && x !== 'body') as string | undefined;
  const label = (field && FIELD_LABEL[field]) || field || 'Dữ liệu';
  switch (i.type) {
    case 'missing': return `Vui lòng nhập ${label.toLowerCase()}.`;
    case 'string_too_short': return `${label} quá ngắn (tối thiểu ${i.ctx?.min_length ?? '?'} ký tự).`;
    case 'string_too_long': return `${label} quá dài (tối đa ${i.ctx?.max_length ?? '?'} ký tự).`;
  }
  if (field === 'email') return 'Email không đúng định dạng (ví dụ: ten@congty.com).';
  return i.msg ? `${label}: ${i.msg}` : `${label} không hợp lệ.`;
}

export function formatApiDetail(detail: unknown): string {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0 && detail.every(d => d && typeof d === 'object' && 'msg' in d)) {
    return Array.from(new Set((detail as ValidationIssue[]).map(describeIssue))).join(' ');
  }
  return JSON.stringify(detail);
}

async function parse<T>(resp: Response): Promise<T> {
  const text = await resp.text();
  const data = text ? JSON.parse(text) : null;
  if (!resp.ok) {
    const detail = (data && (data.detail || data.message)) || resp.statusText;
    throw new ApiError(resp.status, formatApiDetail(detail));
  }
  return data as T;
}

export const api = {
  base: BASE,

  async get<T>(path: string): Promise<T> {
    return parse<T>(await fetch(`${BASE}${path}`, { headers: authHeaders() }));
  },

  async post<T>(path: string, body?: unknown): Promise<T> {
    return parse<T>(await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: body === undefined ? undefined : JSON.stringify(body),
    }));
  },

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return parse<T>(await fetch(`${BASE}${path}`, {
      method: 'PATCH',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: body === undefined ? undefined : JSON.stringify(body),
    }));
  },

  async del(path: string): Promise<void> {
    const resp = await fetch(`${BASE}${path}`, { method: 'DELETE', headers: authHeaders() });
    if (!resp.ok && resp.status !== 204) {
      await parse(resp);
    }
  },

  // multipart upload (file field "file")
  async upload<T>(path: string, file: File): Promise<T> {
    const form = new FormData();
    form.append('file', file);
    return parse<T>(await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: authHeaders(),
      body: form,
    }));
  },

  // #22: upload có theo dõi tiến độ — dùng XHR vì fetch không phát sự kiện upload progress.
  uploadWithProgress<T>(path: string, file: File, onProgress?: (pct: number) => void): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE}${path}`);
      const token = getToken();
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        let data: unknown = null;
        try { data = xhr.responseText ? JSON.parse(xhr.responseText) : null; } catch { /* giữ null */ }
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data as T);
        } else {
          const d = data as { detail?: string; message?: string } | null;
          const detail = (d && (d.detail || d.message)) || xhr.statusText;
          reject(new ApiError(xhr.status, formatApiDetail(detail)));
        }
      };
      xhr.onerror = () => reject(new ApiError(0, 'Lỗi mạng khi tải tệp'));
      const form = new FormData();
      form.append('file', file);
      xhr.send(form);
    });
  },

  // POST nhưng cần biết status code (vd 200 áp dụng vs 202 chờ duyệt)
  async postWithStatus<T>(path: string, body?: unknown): Promise<{ status: number; data: T }> {
    const resp = await fetch(`${BASE}${path}`, {
      method: 'PATCH',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await parse<T>(resp);
    return { status: resp.status, data };
  },

  async patchWithStatus<T>(path: string, body?: unknown): Promise<{ status: number; data: T }> {
    const resp = await fetch(`${BASE}${path}`, {
      method: 'PATCH',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: resp.status, data: await parse<T>(resp) };
  },

  async deleteWithStatus<T>(path: string): Promise<{ status: number; data: T | null }> {
    const resp = await fetch(`${BASE}${path}`, { method: 'DELETE', headers: authHeaders() });
    if (resp.status === 204) return { status: 204, data: null };
    return { status: resp.status, data: await parse<T>(resp) };
  },
};
