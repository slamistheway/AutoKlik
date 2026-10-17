export const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export async function request<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}${path}`, { ...init, cache: 'no-store', headers: { Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers } });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(result?.message ?? `Zahtjev nije uspio (${response.status}).`, response.status);
  return result as T;
}

export const displayDate = (value: string | null) => value ? new Date(value).toLocaleString('hr-HR') : '—';
