import { NextRequest } from 'next/server';
import { json, readJson, sameOrigin, sessionToken, setSession, staffRole, upstream, upstreamError, validToken } from '../../../server/admin-session';

export async function GET(request: NextRequest) {
  const token = sessionToken(request);
  if (!token) return setSession(json({ message: 'Prijavite se.' }, 401), null);
  try {
    const response = await upstream('/admin/me', token);
    if (!response.ok) {
      const result = await upstreamError(response);
      return [401, 403].includes(response.status) ? setSession(result, null) : result;
    }
    const me = await response.json() as { role?: unknown };
    if (!staffRole(me.role)) return setSession(json({ message: 'Potreban je pristup osoblja.' }, 403), null);
    return json({ role: me.role });
  } catch { return json({ message: 'Provjera sesije nije dostupna.' }, 503); }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return json({ message: 'Izvor zahtjeva nije dopušten.' }, 403);
  let body: Record<string, unknown>;
  try { body = await readJson(request); } catch { return json({ message: 'Neispravan zahtjev.' }, 400); }
  if (Object.keys(body).some(key => !['identifier', 'password'].includes(key)) || typeof body.identifier !== 'string' || !body.identifier.trim() || body.identifier.length > 255 || typeof body.password !== 'string' || !body.password || Buffer.byteLength(body.password) > 72) return json({ message: 'Neispravni podaci za prijavu.' }, 400);
  try {
    const response = await upstream('/users/login', undefined, { method: 'POST', body: JSON.stringify(body) });
    if (!response.ok) return upstreamError(response);
    const result = await response.json() as { token?: unknown };
    if (!validToken(result.token)) return json({ message: 'Neispravan odgovor prijave.' }, 502);
    const token = result.token;
    try {
      const staff = await upstream('/admin/me', token);
      if (!staff.ok) {
        await upstream('/users/logout', token, { method: 'POST' }).catch(() => undefined);
        return upstreamError(staff);
      }
      const me = await staff.json() as { role?: unknown };
      if (!staffRole(me.role)) throw new Error('Not staff');
      return setSession(json({ role: me.role }), token);
    } catch {
      await upstream('/users/logout', token, { method: 'POST' }).catch(() => undefined);
      return json({ message: 'Pristup osoblja nije potvrđen.' }, 403);
    }
  } catch { return json({ message: 'Prijava trenutačno nije dostupna.' }, 503); }
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return json({ message: 'Izvor zahtjeva nije dopušten.' }, 403);
  const token = sessionToken(request);
  try {
    if (token) {
      const response = await upstream('/users/logout', token, { method: 'POST' });
      if (!response.ok && response.status !== 401) return setSession(json({ message: 'Lokalna odjava je dovršena, ali sesiju na API-ju nije moguće opozvati.' }, 503), null);
    }
    return setSession(json({ message: 'Odjavljeni ste.' }), null);
  } catch { return setSession(json({ message: 'Lokalna odjava je dovršena, ali sesiju na API-ju nije moguće opozvati.' }, 503), null); }
}
