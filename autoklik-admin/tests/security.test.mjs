import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import NextServer from 'next/server.js';
const { NextRequest } = NextServer;
const runtimeImport = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const adminOrigin = 'https://admin.example';
const secret = 'server-only-bearer-token_123';
function world(fetch, production = true) {
  const cache = new Map();
  function load(file) {
    const filename = path.resolve(root, file);
    if (cache.has(filename)) return cache.get(filename).exports;
    const compiledModule = { exports: {} };
    cache.set(filename, compiledModule);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(code, {
      module: compiledModule, exports: compiledModule.exports, Buffer, URL, AbortSignal, Response, fetch,
      process: { env: { NODE_ENV: production ? 'production' : 'development', NEXT_PUBLIC_API_URL: 'https://api.example' } },
      require: name => name === 'server-only' ? {} : name.startsWith('.') ? load(path.relative(root, path.resolve(path.dirname(filename), name + '.ts'))) : runtimeImport(name),
    }, { filename });
    return compiledModule.exports;
  }
  return load;
}
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
const req = (method, endpoint = '/api/session', body, options = {}) => new NextRequest(adminOrigin + endpoint, {
  method, headers: { ...(method !== 'GET' ? { Origin: adminOrigin } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...options.headers },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
const cookie = { Cookie: `__Host-autoklik-admin-session=${secret}` };

test('login keeps the bearer secret server-side and verifies staff before setting a secure cookie', async () => {
  const calls = [];
  const load = world(async (url, init) => {
    calls.push({ url, init });
    return url.endsWith('/users/login') ? json({ token: secret }) : json({ role: 'admin' });
  });
  const response = await load('src/app/api/session/route.ts').POST(req('POST', undefined, { identifier: 'staff', password: 'Password123!' }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.role, 'admin');
  assert.equal('token' in body, false);
  assert.equal(JSON.stringify(body).includes(secret), false);
  const setCookie = response.headers.get('set-cookie');
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /Secure/i);
  assert.match(setCookie, /SameSite=strict/i);
  assert.match(setCookie, /Max-Age=1800/i);
  assert.equal(calls[0].init.headers.Authorization, undefined);
  assert.equal(calls[1].init.headers.Authorization, `Bearer ${secret}`);
  assert.equal(calls[1].init.redirect, 'error');
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
});

test('non-staff login is denied and its newly-issued API session is revoked', async () => {
  const calls = [];
  const load = world(async url => {
    calls.push(url);
    return url.endsWith('/users/login') ? json({ token: secret }) : url.endsWith('/admin/me') ? json({ role: 'user' }) : json({ message: 'Logged out' });
  });
  const response = await load('src/app/api/session/route.ts').POST(req('POST', undefined, { identifier: 'user', password: 'Password123!' }));
  assert.equal(response.status, 403);
  assert.equal(response.headers.get('set-cookie'), null);
  assert.ok(calls.some(url => url.endsWith('/users/logout')));
});

test('cross-site login, logout and moderation never reach the API', async () => {
  let calls = 0;
  const load = world(async () => { calls++; return json({}); });
  const session = load('src/app/api/session/route.ts');
  for (const method of ['POST', 'DELETE']) {
    const response = await session[method](req(method, undefined, undefined, { headers: { Origin: 'https://evil.example', ...cookie } }));
    assert.equal(response.status, 403);
  }
  const proxy = load('src/app/api/backend/[...path]/route.ts');
  const response = await proxy.POST(req('POST', '/api/backend/admin/ads/moderate', { ids: [1] }, { headers: { Origin: 'null', ...cookie } }), { params: Promise.resolve({ path: ['admin', 'ads', 'moderate'] }) });
  assert.equal(response.status, 403);
  assert.equal(calls, 0);
});

test('origin checks handle Next internal URLs without trusting forwarded hosts', () => {
  const { sameOrigin } = world(async () => json({}))('src/server/admin-session.ts');
  assert.equal(sameOrigin(new NextRequest('https://internal.example/api/session', { headers: { Host: 'admin.example', Origin: adminOrigin } })), true);
  assert.equal(sameOrigin(new NextRequest('https://internal.example/api/session', { headers: { Host: 'admin.example', Origin: 'https://evil.example', 'X-Forwarded-Host': 'evil.example' } })), false);
});

test('proxy restricts upstream paths and strips untrusted credentials and response cookies', async () => {
  const calls = [];
  const load = world(async (url, init) => { calls.push({ url, init }); return json({ items: [] }, 200, { 'Set-Cookie': 'leak=bad' }); });
  const proxy = load('src/app/api/backend/[...path]/route.ts');
  for (const path of [['users', 'me'], ['admin', '..'], ['admin', 'https://evil.example']]) {
    const response = await proxy.GET(req('GET', '/api/backend/admin/users', undefined, { headers: cookie }), { params: Promise.resolve({ path }) });
    assert.equal(response.status, 400);
  }
  assert.equal(calls.length, 0);
  const response = await proxy.GET(req('GET', '/api/backend/admin/users?page=1', undefined, { headers: { ...cookie, Authorization: 'Bearer attacker' } }), { params: Promise.resolve({ path: ['admin', 'users'] }) });
  assert.equal(response.status, 200);
  assert.equal(calls[0].url, 'https://api.example/admin/users?page=1');
  assert.equal(calls[0].init.headers.Authorization, `Bearer ${secret}`);
  assert.equal(calls[0].init.headers.Cookie, undefined);
  assert.equal(response.headers.get('set-cookie'), null);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
});

test('missing or expired staff sessions cannot reach admin data', async () => {
  let calls = 0;
  const load = world(async () => { calls++; return json({ message: 'Expired' }, 401); });
  const proxy = load('src/app/api/backend/[...path]/route.ts');
  assert.equal((await proxy.GET(req('GET', '/api/backend/admin/users'), { params: Promise.resolve({ path: ['admin', 'users'] }) })).status, 401);
  assert.equal(calls, 0);
  const response = await load('src/app/api/session/route.ts').GET(req('GET', undefined, undefined, { headers: cookie }));
  assert.equal(response.status, 401);
  assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
});

test('logout clears the browser cookie even when remote revocation fails', async () => {
  const load = world(async () => { throw new Error('Offline'); });
  const response = await load('src/app/api/session/route.ts').DELETE(req('DELETE', undefined, undefined, { headers: cookie }));
  assert.equal(response.status, 503);
  assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
});

test('oversized JSON and unexpected login fields fail before authentication', async () => {
  let calls = 0;
  const load = world(async () => { calls++; return json({}); });
  const session = load('src/app/api/session/route.ts');
  assert.equal((await session.POST(req('POST', undefined, { identifier: 'staff', password: 'x', role: 'admin' }))).status, 400);
  assert.equal((await session.POST(req('POST', undefined, { identifier: 'x'.repeat(65536), password: 'x' }))).status, 400);
  assert.equal(calls, 0);
});

test('production API URLs and security headers restrict credential destinations', () => {
  const load = world(async () => json({}));
  const { validateApiOrigin } = load('src/lib/api-origin.ts');
  for (const url of ['http://localhost:3001', 'https://user:pass@api.example', 'https://api.example/path', 'javascript:alert(1)']) assert.throws(() => validateApiOrigin(url));
  const config = load('next.config.ts').default;
  const headers = Object.fromEntries(config.headers()[0].headers.map(header => [header.key, header.value]));
  assert.match(headers['Content-Security-Policy'], /connect-src 'self';/);
  assert.doesNotMatch(headers['Content-Security-Policy'], /unsafe-eval|ws:/);
  assert.equal(headers['X-Frame-Options'], 'DENY');
  assert.equal(headers['Referrer-Policy'], 'no-referrer');
  assert.equal(headers['X-Robots-Tag'], 'noindex, nofollow, noarchive');
});

test('the client sends same-origin cookie requests without a browser bearer token', async () => {
  const calls = [];
  const load = world(async (url, init) => { calls.push({ url, init }); return json({ items: [] }); });
  const client = load('src/app/admin-client.ts');
  await client.request(client.ADMIN_SESSION, '/admin/users', { headers: { Authorization: 'Bearer attacker' } });
  assert.equal(calls[0].url, '/api/backend/admin/users');
  assert.equal(calls[0].init.credentials, 'same-origin');
  assert.equal(calls[0].init.headers.Authorization, undefined);
  assert.equal(calls[0].init.redirect, 'error');
  await assert.rejects(client.request(secret, '/admin/users'));
  await assert.rejects(client.request(client.ADMIN_SESSION, '//evil.example'));
  assert.equal(calls.length, 1);
});
