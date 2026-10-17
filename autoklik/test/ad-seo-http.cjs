const assert = require('node:assert/strict');
const base = process.env.SEO_TEST_URL || 'http://localhost:3000';
async function check() {
  assert(['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname), 'Use a local development server');
  const legacy = await fetch(base + '/ad/2', {redirect: 'manual'});
  assert.equal(legacy.status, 308);
  const destination = legacy.headers.get('location');
  assert.match(destination, /^\/ad\/2\/[a-z0-9-]+$/);
  const response = await fetch(new URL(destination, base));
  assert.equal(response.status, 200);
  // Next dev replaces the application header with its own no-cache header.
  assert.match(response.headers.get('cache-control'), /private.*no-store|no-cache, must-revalidate/);
  const html = await response.text();
  const visibleHtml = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  assert.match(visibleHtml, /<h1[^>]*>BMW Serija 3 320d<\/h1>/);
  assert(visibleHtml.includes('Uredan automobil s bogatom opremom.'));
  assert(!visibleHtml.includes('Učitavanje oglasa'));
  assert.match(html, /<title[^>]*>BMW Serija 3 320d \| AutoKlik<\/title>/);
  assert.match(html, /<meta name="description" content="Uredan automobil s bogatom opremom\."/);
  assert(html.includes('rel="canonical" href="' + base + destination + '"'));
  for (const property of ['og:title', 'og:description', 'og:url', 'og:image']) assert(html.includes('property="' + property + '"'));
  assert(html.includes('name="twitter:card" content="summary_large_image"'));
  const json = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
  assert(json, 'JSON-LD must be in server HTML');
  const vehicle = JSON.parse(json[1]);
  assert.equal(vehicle['@type'], 'Vehicle');
  assert.equal(vehicle.name, 'BMW Serija 3 320d');
  assert.equal(vehicle.offers.priceCurrency, 'EUR');
  assert.equal(vehicle.url, base + destination);
  const stale = await fetch(base + '/ad/2/outdated-title', {redirect: 'manual'});
  assert.equal(stale.status, 307);
  assert.equal(stale.headers.get('location'), destination);
  assert.equal((await fetch(base + '/ad/999999999/missing')).status, 404);
  assert.equal((await fetch(base + '/ad/invalid')).status, 404);
  console.log('PASS: real HTTP legacy/stale redirects, server HTML listing/title/description, canonical, social metadata, parsed JSON-LD, private caching and real 404 responses.');
}
check().catch(error => { console.error(error); process.exitCode = 1; });
