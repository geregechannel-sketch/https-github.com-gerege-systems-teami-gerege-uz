// Thin ec3api client: st-token auth + {success,data} envelope.
const TOKEN_KEY = "jwtToken";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setToken(t: string | null) {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

const BASE = "/ec3api/v1/";

export interface Envelope<T = any> {
  success: boolean;
  data?: T;
  totalCount?: number;
  code?: number;
  message?: string;
}

async function request<T = any>(method: string, path: string, body?: any): Promise<Envelope<T>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const tok = getToken();
  if (tok) headers["st-token"] = tok;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let env: Envelope<T>;
  try {
    env = await res.json();
  } catch {
    env = { success: false, code: res.status, message: res.statusText };
  }
  if (res.status === 401) {
    setToken(null);
    if (location.pathname !== "/login") location.assign("/login");
  }
  return env;
}

export const api = {
  get: <T = any>(path: string) => request<T>("GET", path),
  post: <T = any>(path: string, body?: any) => request<T>("POST", path, body),
  put: <T = any>(path: string, body?: any) => request<T>("PUT", path, body),
  del: <T = any>(path: string) => request<T>("DELETE", path),

  async login(login: string, password: string): Promise<Envelope> {
    const env = await request("POST", "user/login", { login, password });
    if (env.success && (env.data as any)?.token) setToken((env.data as any).token);
    return env;
  },
  logout() {
    setToken(null);
  },
};
