const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
function load(file, options = {}) {
    const filename = path.resolve(root, file);
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    const module = { exports: {} };
    const context = {
        module, exports: module.exports, URL,
        process: { env: { NODE_ENV: 'test', ...options.env } },
        ...options.globals,
        require: name => {
            if (options.modules?.[name]) return options.modules[name];
            if (name === '@/shared/api-url' || name === './src/shared/api-url') return load('src/shared/api-url.ts', options);
            return require(name);
        },
    };
    vm.runInNewContext(source, context, { filename });
    return module.exports;
}

test('login return URLs remain internal, including encoded attacks', () => {
    const { safeReturnUrl } = load('src/shared/safe-redirect.ts');
    for (const value of ['https://evil.example', '//evil.example', '/\\evil.example', '/%5cevil.example', '/%2f%2fevil.example', '/%252f%252fevil.example', '/\nevil', '/%0aevil', '/%ZZ', undefined, ['/myProfile']]) {
        assert.equal(safeReturnUrl(value), '/');
    }
    assert.equal(safeReturnUrl('/search?brands=VW&priceMax=15000#results'), '/search?brands=VW&priceMax=15000#results');
});

test('production API URL must be an explicit HTTPS origin', () => {
    for (const value of [undefined, 'http://localhost:3001', 'javascript:alert(1)', 'https://user:secret@api.example', 'https://api.example/path', 'https://api.example?token=x']) {
        assert.throws(() => load('src/shared/api-url.ts', { env: { NODE_ENV: 'production', NEXT_PUBLIC_API_URL: value } }));
    }
    assert.equal(load('src/shared/api-url.ts', { env: { NODE_ENV: 'production', NEXT_PUBLIC_API_URL: 'https://api.example/' } }).API_BASE_URL, 'https://api.example');
});

test('security headers permit required resources without production eval or framing', () => {
    const config = load('next.config.ts', { env: { NODE_ENV: 'production', NEXT_PUBLIC_API_URL: 'https://api.example' } }).default;
    const headers = Object.fromEntries(config.headers()[0].headers.map(header => [header.key, header.value]));
    assert.equal(headers['X-Content-Type-Options'], 'nosniff');
    assert.equal(headers['Referrer-Policy'], 'no-referrer');
    assert.equal(headers['X-Frame-Options'], 'DENY');
    assert.match(headers['Content-Security-Policy'], /connect-src 'self' https:\/\/api.example/);
    assert.match(headers['Content-Security-Policy'], /script-src-attr 'none'/);
    assert.match(headers['Content-Security-Policy'], /frame-src https:\/\/www.openstreetmap.org/);
    assert.doesNotMatch(headers['Content-Security-Policy'], /unsafe-eval|localhost|ws:/);
    assert.equal(config.images.dangerouslyAllowSVG, false);
    assert.equal(config.images.dangerouslyAllowLocalIP, false);
    assert.equal(config.poweredByHeader, false);
});

test('session cookies are bounded, secure on HTTPS and reject malformed tokens', () => {
    const values = new Map();
    let attributes;
    class Cookies {
        get(name) { return values.get(name); }
        set(name, value, options) { values.set(name, value); attributes = options; }
        remove(name) { values.delete(name); }
    }
    const { sessionCookie } = load('src/components/cookies/cookies.ts', {
        modules: { 'react-cookie': { Cookies } },
        globals: { window: { location: { protocol: 'https:' } }, localStorage: { removeItem() {} } },
    });
    sessionCookie.setSessionToken('safe-random-token_123');
    assert.equal(sessionCookie.getSessionToken(), 'safe-random-token_123');
    assert.equal(attributes.secure, true);
    assert.equal(attributes.sameSite, 'lax');
    assert.equal(attributes.maxAge, 86400);
    for (const token of ['', 'x\r\nInjected: value', 'x'.repeat(513)]) assert.throws(() => sessionCookie.setSessionToken(token));
    sessionCookie.removeSessionToken();
    assert.equal(sessionCookie.getSessionToken(), null);
});

test('seller-controlled JSON-LD cannot terminate its script element', () => {
    const { serializeStructuredData } = load('src/shared/ad-seo.ts');
    const serialized = serializeStructuredData({ description: '</script><script>alert(1)</script>' });
    assert.doesNotMatch(serialized, /<|>/);
    assert.equal(JSON.parse(serialized).description, '</script><script>alert(1)</script>');
});

test('a forged cookie cannot authorize a protected page without API verification', async () => {
    const effects = [];
    const updates = [];
    const destinations = [];
    let token = 'forged-session';
    const guards = load('src/app/auth/auth-guards.tsx', {
        globals: {
            window: {},
            fetch: async () => ({ ok: false, status: 401 }),
        },
        modules: {
            react: { useEffect: effect => effects.push(effect), useState: value => [value, next => updates.push(next)] },
            'next/router': { useRouter: () => ({ isReady: true, asPath: '/mySettings', replace: value => destinations.push(value) }) },
            '@/components/cookies/cookies': { sessionCookie: { getSessionToken: () => token, removeSessionToken: () => { token = null; } } },
        },
    });
    assert.equal(guards.authGuard(() => null)({}), null);
    effects[0]();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(updates.includes(true), false);
    assert.equal(token, null);
    assert.deepEqual(destinations, ['/login?returnUrl=%2FmySettings']);
});
