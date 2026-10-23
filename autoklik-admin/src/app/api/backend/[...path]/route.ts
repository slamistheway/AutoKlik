import { NextRequest } from 'next/server';
import { json, readJson, sameOrigin, sessionToken, setSession, upstream, upstreamError } from '../../../../server/admin-session';

type Context = { params: Promise<{ path: string[] }> };
async function proxy(request: NextRequest, context: Context) {
  if (request.method !== 'GET' && !sameOrigin(request)) return json({ message: 'Izvor zahtjeva nije dopušten.' }, 403);
  const token = sessionToken(request);
  if (!token) return json({ message: 'Prijavite se.' }, 401);
  const { path } = await context.params;
  if (path[0] !== 'admin' || path.some(part => !/^[a-zA-Z0-9-]+$/.test(part)) || path.length > 8) return json({ message: 'Nedopuštena ruta.' }, 400);
  let body: string | undefined;
  if (request.method !== 'GET') {
    try { body = JSON.stringify(await readJson(request)); } catch { return json({ message: 'Neispravan zahtjev.' }, 400); }
  }
  const query = new URL(request.url).search;
  if (query.length > 8192) return json({ message: 'Preduga pretraga.' }, 400);
  try {
    const response = await upstream(`/${path.join('/')}${query}`, token, { method: request.method, body });
    if (!response.ok) {
      const result = await upstreamError(response);
      return response.status === 401 ? setSession(result, null) : result;
    }
    if (!response.headers.get('content-type')?.includes('application/json')) return json({ message: 'Neispravan odgovor API-ja.' }, 502);
    return new Response(response.body, { status: response.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch { return json({ message: 'API trenutačno nije dostupan.' }, 503); }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
