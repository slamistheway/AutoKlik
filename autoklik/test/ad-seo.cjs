const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('../../api/node_modules/typescript');
const root = path.resolve(__dirname, '../src');
let fetchResponse;
let fetchCalls = [];
const modules = new Map();
function load(file) {
  if (modules.has(file)) return modules.get(file);
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
  }).outputText;
  vm.runInNewContext(source, {
    exports, process: {env: {SITE_URL: 'https://autoklik.example', API_URL: 'http://api.internal'}},
    URL, AbortSignal,
    fetch: async (...args) => { fetchCalls.push(args); if (fetchResponse instanceof Error) throw fetchResponse; return fetchResponse; },
    require: name => name.startsWith('@/') ? load(path.join(root, name.slice(2) + '.ts')) : require(name),
  }, {filename: file});
  modules.set(file, exports);
  return exports;
}
const {getAdPath, getAdSeo, serializeStructuredData} = load(path.join(root, 'shared/ad-seo.ts'));
const {toAdFullData} = load(path.join(root, 'shared/ad-data.ts'));
const {getAdPageProps} = load(path.join(root, 'server/ad-page-props.ts'));
const raw = {id: 12, user_id: 3, title: 'Škoda Čačak / 2.0', description: '</script><script>alert(1)</script>',
  price: '12500.50', year: 2020, kilometrage: 92000, condition: 'condition_used', county: 'Split',
  images: ['ad-images/car.jpg'], status: 'active', seller_username: 'Seller', expires_at: '2030-01-01T00:00:00Z'};
const ad = toAdFullData(raw);
function context(params, token) {
  const headers = {};
  return {params, req: {cookies: token ? {'autoklik.betterAuthSession': token} : {}},
    res: {setHeader: (key, value) => { headers[key] = value; }}, headers};
}
function response(status, data = raw) { return {ok: status === 200, status, json: async () => data}; }
async function check() {
  assert.equal(getAdPath(ad), '/ad/12/skoda-cacak-2-0');
  assert.equal(getAdPath({id: 12, title: '!!!'}), '/ad/12/vozilo');
  const seo = getAdSeo(ad, 'https://autoklik.example');
  assert.equal(seo.url, 'https://autoklik.example/ad/12/skoda-cacak-2-0');
  assert.equal(seo.image, 'http://localhost:3001/ad-images/car.jpg');
  assert.equal(getAdSeo({...ad, images: ['/ad-images/car.jpg']}, 'https://autoklik.example').image, 'http://localhost:3001/ad-images/car.jpg');
  assert.equal(seo.structuredData.offers.priceCurrency, 'EUR');
  assert.equal(seo.structuredData.offers.price, '12500.50');
  assert.equal(seo.structuredData.offers.availability, 'https://schema.org/InStock');
  assert.equal(getAdSeo({...ad, status: 'sold'}, 'https://autoklik.example').structuredData.offers.availability, 'https://schema.org/SoldOut');
  assert.equal(getAdSeo({...ad, status: 'expired'}, 'https://autoklik.example').structuredData.offers.availability, 'https://schema.org/OutOfStock');
  assert(!('offers' in getAdSeo({...ad, price: ''}, 'https://autoklik.example').structuredData));
  const json = serializeStructuredData(seo.structuredData);
  assert(!json.includes('<'));
  assert.equal(JSON.parse(json).description, raw.description);
  fetchResponse = response(200);
  let ctx = context({id: '12'});
  let result = await getAdPageProps(ctx);
  assert.equal(result.redirect.destination, getAdPath(ad));
  assert.equal(result.redirect.permanent, true);
  ctx = context({id: '12', slug: 'old-title'});
  result = await getAdPageProps(ctx);
  assert.equal(result.redirect.permanent, false);
  ctx = context({id: '12', slug: 'skoda-cacak-2-0'}, 'test-session');
  result = await getAdPageProps(ctx);
  assert.equal(result.props.initialAd.title, raw.title);
  assert.equal(result.props.siteUrl, 'https://autoklik.example');
  assert.equal(ctx.headers['Cache-Control'], 'private, no-store');
  assert.equal(fetchCalls.at(-1)[0], 'http://api.internal/ads/12');
  assert.equal(fetchCalls.at(-1)[1].headers.Authorization, 'Bearer test-session');
  fetchResponse = response(200, {...raw, status: 'hidden'});
  result = await getAdPageProps(ctx);
  assert.equal(ctx.headers['X-Robots-Tag'], 'noindex, nofollow');
  fetchResponse = response(404);
  result = await getAdPageProps(context({id: '12'}));
  assert.equal(result.notFound, true);
  const count = fetchCalls.length;
  assert.equal((await getAdPageProps(context({id: 'bad'}))).notFound, true);
  assert.equal(fetchCalls.length, count);
  fetchResponse = new Error('API down');
  ctx = context({id: '12', slug: 'skoda-cacak-2-0'});
  result = await getAdPageProps(ctx);
  assert.equal(ctx.res.statusCode, 503);
  assert.equal(ctx.headers['Retry-After'], '60');
  assert.equal(result.props.initialAd, null);
  console.log('PASS: canonical slugs/redirects, metadata, image origins, offer availability, JSON-LD injection safety, SSR data, session forwarding, hidden noindex, 404 and 503.');
}
check().catch(error => { console.error(error); process.exitCode = 1; });
