// HTTP client mỏng cho backend ProjectHub: gắn JWT, parse JSON, ném lỗi có status.
const BASE: string = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:8000/api/v1';

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

async function parse<T>(resp: Response): Promise<T> {
  const text = await resp.text();
  const data = text ? JSON.parse(text) : null;
  if (!resp.ok) {
    const detail = (data && (data.detail || data.message)) || resp.statusText;
    throw new ApiError(resp.status, typeof detail === 'string' ? detail : JSON.stringify(detail));
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
