import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { publicApiOrigin, validateApiOrigin } from '../lib/api-origin';

export const SESSION_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-autoklik-admin-session' : 'autoklik-admin-session';
export const SESSION_SECONDS = 30 * 60;
export const validToken = (value: unknown): value is string => typeof value === 'string' && value.length <= 512 && /^[A-Za-z0-9._~+/-]+=*$/.test(value);
export const staffRole = (value: unknown): value is 'admin' | 'moderator' => value === 'admin' || value === 'moderator';

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}

export function setSession(response: NextResponse, token: string | null) {
  response.cookies.set(SESSION_COOKIE, token ?? '', {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: token ? SESSION_SECONDS : 0,
  });
  return response;
}

export function sessionToken(request: NextRequest) {
  const value = request.cookies.get(SESSION_COOKIE)?.value;
  return validToken(value) ? value : null;
}

export function sameOrigin(request: NextRequest) {
  const target = new URL(request.url);
  // Next can use an internal hostname in request.url. Use the real Host header,
  // never client-supplied forwarded-host headers; production proxies should set ADMIN_ORIGIN.
  if (request.headers.get('host')) target.host = request.headers.get('host')!;
  const origin = process.env.ADMIN_ORIGIN ? validateApiOrigin(process.env.ADMIN_ORIGIN) : target.origin;
  return request.headers.get('origin') === origin && !['cross-site', 'none'].includes(request.headers.get('sec-fetch-site') ?? '');
}

export async function readJson(request: NextRequest): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new Error('JSON required');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Body required');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 64 * 1024) throw new Error('Body too large');
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  const body: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Object required');
  return body as Record<string, unknown>;
}

// Never forward browser cookies, arbitrary headers, redirects or client-chosen URLs.
export function upstream(path: string, token?: string, init: RequestInit = {}) {
  const origin = process.env.API_URL ? validateApiOrigin(process.env.API_URL) : publicApiOrigin();
  return fetch(`${origin}${path}`, {
    ...init, cache: 'no-store', redirect: 'error', signal: init.signal ?? AbortSignal.timeout(15000),
    headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
}

export async function upstreamError(response: Response) {
  const body: unknown = await response.json().catch(() => null);
  const message = response.status < 500 && body && typeof body === 'object' && 'message' in body && typeof body.message === 'string' ? body.message.slice(0, 500) : 'Zahtjev nije uspio. Pokušajte ponovno.';
  const result = json({ message }, response.status);
  for (const key of ['Retry-After', 'Retry-After-burst']) {
    const value = response.headers.get(key);
    if (value && /^\d{1,6}$/.test(value)) result.headers.set(key, value);
  }
  return result;
}
