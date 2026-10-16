// HTTP client mỏng cho backend ProjectHub: gắn JWT, parse JSON, ném lỗi có status.
import i18n from '../i18n';

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
  /** Nguyên văn `detail` BE trả về (để debug) — câu hiển thị cho người dùng là `message`. */
  detail: string;
  /** #29: mã lỗi ổn định từ BE (vd "phase.forbidden_edit") — FE dịch theo mã này. */
  code?: string;
  params?: Record<string, unknown>;
  constructor(status: number, message: string,
    extra: { detail?: string; code?: string; params?: Record<string, unknown> } = {}) {
    super(message);
    this.status = status;
    this.detail = extra.detail ?? message;
    this.code = extra.code;
    this.params = extra.params;
  }
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra ?? {}),
  };
}

// t() với khóa động (mã lỗi từ BE) — khóa đã được kiểm tra bằng i18n.exists trước khi gọi.
const tDynamic = i18n.t as unknown as (key: string, options?: Record<string, unknown>) => string;

// #33: FastAPI trả 422 với `detail` là mảng [{ loc, msg, type, ctx }] — trước đây hiện nguyên
// JSON thô. Dịch sang câu rõ ràng theo trường (#29: theo ngôn ngữ đang chọn); trường lạ dùng `msg` gốc.
const FIELD_KEYS = ['email', 'password', 'name', 'title'] as const;

interface ValidationIssue { loc?: (string | number)[]; msg?: string; type?: string; ctx?: Record<string, unknown>; }

function describeIssue(i: ValidationIssue): string {
  const field = [...(i.loc ?? [])].reverse().find(x => typeof x === 'string' && x !== 'body') as string | undefined;
  const known = FIELD_KEYS.find(k => k === field);
  const label = known ? i18n.t(`validation.fields.${known}`) : (field || i18n.t('validation.fields.data'));
  switch (i.type) {
    case 'missing': return i18n.t('validation.missing', { field: label.toLowerCase() });
    case 'string_too_short': return i18n.t('validation.tooShort', { field: label, min: String(i.ctx?.min_length ?? '?') });
    case 'string_too_long': return i18n.t('validation.tooLong', { field: label, max: String(i.ctx?.max_length ?? '?') });
  }
  if (field === 'email') return i18n.t('auth.validation.emailInvalid');
  return i.msg ? `${label}: ${i.msg}` : i18n.t('validation.invalid', { field: label });
}

export function formatApiDetail(detail: unknown): string {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0 && detail.every(d => d && typeof d === 'object' && 'msg' in d)) {
    return Array.from(new Set((detail as ValidationIssue[]).map(describeIssue))).join(' ');
  }
  return JSON.stringify(detail);
}

// Body lỗi của BE: { detail, code?, params? } (#29) — dựng ApiError với câu đã dịch.
function toApiError(status: number, data: unknown, statusText: string): ApiError {
  const body = (data && typeof data === 'object' ? data : {}) as {
    detail?: unknown; message?: unknown; code?: unknown; params?: unknown;
  };
  const raw = body.detail ?? body.message ?? statusText;
  const code = typeof body.code === 'string' ? body.code : undefined;
  const params = body.params && typeof body.params === 'object' ? body.params as Record<string, unknown> : undefined;
  const text = formatApiDetail(raw);
  const message = code && i18n.exists(`errors.${code}`)
    ? tDynamic(`errors.${code}`, params)
    : (text || i18n.t('errors.generic'));
  return new ApiError(status, message, { detail: typeof raw === 'string' ? raw : JSON.stringify(raw), code, params });
}

async function parse<T>(resp: Response): Promise<T> {
  const text = await resp.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* body không phải JSON */ }
  if (!resp.ok) throw toApiError(resp.status, data, resp.statusText);
  return data as T;
}

// fetch ném TypeError khi mất mạng / sai địa chỉ → đổi thành ApiError có câu dễ hiểu.
async function send(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new ApiError(0, i18n.t('errors.network'));
  }
}

export const api = {
  base: BASE,

  async get<T>(path: string): Promise<T> {
    return parse<T>(await send(`${BASE}${path}`, { headers: authHeaders() }));
  },

  async post<T>(path: string, body?: unknown): Promise<T> {
    return parse<T>(await send(`${BASE}${path}`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: body === undefined ? undefined : JSON.stringify(body),
    }));
  },

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return parse<T>(await send(`${BASE}${path}`, {
      method: 'PATCH',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: body === undefined ? undefined : JSON.stringify(body),
    }));
  },

  async del(path: string): Promise<void> {
    const resp = await send(`${BASE}${path}`, { method: 'DELETE', headers: authHeaders() });
    if (!resp.ok && resp.status !== 204) {
      await parse(resp);
    }
  },

  // multipart upload (file field "file")
  async upload<T>(path: string, file: File): Promise<T> {
    const form = new FormData();
    form.append('file', file);
    return parse<T>(await send(`${BASE}${path}`, {
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
          reject(toApiError(xhr.status, data, xhr.statusText));
        }
      };
      xhr.onerror = () => reject(new ApiError(0, i18n.t('errors.network')));
      const form = new FormData();
      form.append('file', file);
      xhr.send(form);
    });
  },

  // POST nhưng cần biết status code (vd 200 áp dụng vs 202 chờ duyệt)
  async postWithStatus<T>(path: string, body?: unknown): Promise<{ status: number; data: T }> {
    const resp = await send(`${BASE}${path}`, {
      method: 'PATCH',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await parse<T>(resp);
    return { status: resp.status, data };
  },

  async patchWithStatus<T>(path: string, body?: unknown): Promise<{ status: number; data: T }> {
    const resp = await send(`${BASE}${path}`, {
      method: 'PATCH',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: resp.status, data: await parse<T>(resp) };
  },

  async deleteWithStatus<T>(path: string): Promise<{ status: number; data: T | null }> {
    const resp = await send(`${BASE}${path}`, { method: 'DELETE', headers: authHeaders() });
    if (resp.status === 204) return { status: 204, data: null };
    return { status: resp.status, data: await parse<T>(resp) };
  },
};
