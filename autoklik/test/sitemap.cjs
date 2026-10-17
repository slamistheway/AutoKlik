const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('../../api/node_modules/typescript');
const root = path.resolve(__dirname, '../src');
const modules = new Map();
const env = { SITE_URL: 'https://autoklik.example', API_URL: 'http://api.internal' };
let payload;
let status = 200;
let calls = [];
function load(file) {
  if (modules.has(file)) return modules.get(file);
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { exports, process: { env }, URL, AbortSignal, Request, Response,
    fetch: async (...args) => { calls.push(args); return { ok: status === 200, json: async () => payload }; },
    require: name => name.startsWith('@/') ? load(path.join(root, name.slice(2) + '.ts')) : require(name),
  }, { filename: file });
  modules.set(file, exports); return exports;
}
const { sitemapResponse, robotsResponse } = load(path.join(root, 'server/sitemap.ts'));
const request = path => new Request('https://untrusted-host.example' + path, { headers: { Cookie: 'private-session', Authorization: 'Bearer private-session' } });

async function check() {
  payload = { ads: 2001, sellers: 1001, pageSize: 1000 };
  let response = await sitemapResponse('index', request('/sitemap.xml'));
  assert.equal(response.status, 200);
  let xml = await response.text();
  assert.equal((xml.match(/<sitemap>/g) || []).length, 6);
  assert(xml.includes('https://autoklik.example/sitemap-ads.xml?page=3'));
  assert(xml.includes('https://autoklik.example/sitemap-sellers.xml?page=2'));
  assert(!xml.includes('untrusted-host'));
  assert.equal(calls[0][1].headers, undefined, 'Never forward caller credentials');
  assert.match(response.headers.get('content-type'), /application\/xml/);
  payload = { items: [{ id: 7, title: 'Škoda & <Golf> / đ', lastModified: '2026-10-17' }, { id: 8, title: null, lastModified: null }], pageSize: 1000 };
  response = await sitemapResponse('ads', request('/sitemap-ads.xml?page=2'));
  xml = await response.text();
  assert(xml.includes('/ad/7/skoda-golf-d'));
  assert(xml.includes('/ad/8/oglas-bez-naslova'));
  assert(xml.includes('<lastmod>2026-10-17</lastmod>'));
  assert(!xml.includes('<Golf>'));
  assert(calls.at(-1)[0].endsWith('kind=ads&page=2'));
  payload = { items: [{ id: 4 }], pageSize: 1000 };
  xml = await (await sitemapResponse('sellers', request('/sitemap-sellers.xml?page=1'))).text();
  assert(xml.includes('https://autoklik.example/seller/4'));
  assert(!xml.includes('<lastmod>'), 'Do not invent seller modification dates');
  calls = [];
  xml = await (await sitemapResponse('pages', request('/sitemap-pages.xml'))).text();
  assert(xml.includes('<loc>https://autoklik.example/</loc>'));
  for (const privatePath of ['/checkout', '/myMessages', '/myProfile', '/login', '/search', '/appeal']) assert(!xml.includes(privatePath));
  assert.equal(calls.length, 0);
  for (const query of ['page=0', 'page=-1', 'page=1.5', 'page=100001', 'page=1&page=2', 'page=1&token=secret']) assert.equal((await sitemapResponse('ads', request('/sitemap-ads.xml?' + query))).status, 404);
  assert.equal(calls.length, 0, 'Invalid pages must not query the API');
  status = 503;
  response = await sitemapResponse('index', request('/sitemap.xml'));
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('retry-after'), '60');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  status = 200; payload = { ads: 0, sellers: 0, pageSize: 1000 };
  xml = await (await sitemapResponse('index', request('/sitemap.xml'))).text();
  assert.equal((xml.match(/<sitemap>/g) || []).length, 1);
  assert.match(await robotsResponse().text(), /Sitemap: https:\/\/autoklik\.example\/sitemap\.xml/);
  env.SITE_URL = 'file:///private';
  assert.equal(robotsResponse().status, 503);
  console.log('PASS: canonical URLs, complete sharding, credential isolation, Unicode slugs, modification dates, private-route exclusion, pagination validation, robots discovery and non-cacheable upstream failures.');
}
check().catch(error => { console.error(error); process.exitCode = 1; });
