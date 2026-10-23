import { publicApiOrigin } from '../lib/api-origin';

export const API = publicApiOrigin();
export const ADMIN_SESSION = 'server-session';

export function sessionEnded() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('admin-session-ended'));
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export async function request<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  if (token !== ADMIN_SESSION) throw new ApiError('Prijavite se.', 401);
  const logout = path === '/users/logout';
  if (!logout && (!path.startsWith('/admin/') || /[\\\r\n#]/.test(path))) throw new Error('Nedopuštena ruta.');
  const response = await fetch(logout ? '/api/session' : `/api/backend${path}`, {
    ...init, method: logout ? 'DELETE' : init.method, cache: 'no-store', credentials: 'same-origin', redirect: 'error',
    headers: init.body ? { 'Content-Type': 'application/json' } : {},
  });
  const result: unknown = await response.json().catch(() => null);
  if (response.status === 401 || logout) sessionEnded();
  if (!response.ok) {
    const message = result && typeof result === 'object' && 'message' in result && typeof result.message === 'string' ? result.message : `Zahtjev nije uspio (${response.status}).`;
    throw new ApiError(message, response.status);
  }
  return result as T;
}

export const displayDate = (value: string | null) => value ? new Date(value).toLocaleString('hr-HR') : '—';
