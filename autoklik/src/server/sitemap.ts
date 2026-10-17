import { getAdPath } from '@/shared/ad-seo';

type Kind = 'index' | 'pages' | 'ads' | 'sellers';
const namespace = 'http://www.sitemaps.org/schemas/sitemap/0.9';
const escapeXml = (value: string) => value.replace(/[<>&"']/g, character => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[character]!);

function siteOrigin() {
  const url = new URL(process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000');
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid SITE_URL');
  return url.origin;
}

async function feed(kind: string, page: number) {
  const api = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/+$/, '');
  const response = await fetch(`${api}/ads/sitemap?kind=${kind}&page=${page}`, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('Sitemap feed unavailable');
  return response.json();
}

const headers = { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=300', 'X-Content-Type-Options': 'nosniff' };

export async function sitemapResponse(kind: Kind, request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams;
  const rawPage = query.get('page') ?? '1';
  if ([...query.keys()].some(key => key !== 'page') || query.getAll('page').length > 1 || !/^[1-9]\d*$/.test(rawPage) || Number(rawPage) > 100000 || (['index', 'pages'].includes(kind) && query.size > 0)) {
    return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    const origin = siteOrigin();
    const absolute = (path: string) => escapeXml(new URL(path, origin).href);
    if (kind === 'index') {
      const counts = await feed('counts', 1);
      if (!Number.isSafeInteger(counts.ads) || counts.ads < 0 || !Number.isSafeInteger(counts.sellers) || counts.sellers < 0 || counts.pageSize !== 1000) throw new Error('Invalid sitemap counts');
      const adsPages = Math.ceil(counts.ads / counts.pageSize);
      const sellersPages = Math.ceil(counts.sellers / counts.pageSize);
      if (adsPages + sellersPages + 1 > 50000) throw new Error('Sitemap index limit exceeded');
      const paths = ['/sitemap-pages.xml', ...Array.from({ length: adsPages }, (_, index) => `/sitemap-ads.xml?page=${index + 1}`), ...Array.from({ length: sellersPages }, (_, index) => `/sitemap-sellers.xml?page=${index + 1}`)];
      return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="${namespace}">${paths.map(path => `<sitemap><loc>${absolute(path)}</loc></sitemap>`).join('')}</sitemapindex>`, { headers });
    }
    let entries: { path: string; lastModified?: string }[] = [{ path: '/' }];
    if (kind !== 'pages') {
      const data = await feed(kind, Number(rawPage));
      if (data.pageSize !== 1000 || !Array.isArray(data.items) || data.items.length > 1000) throw new Error('Invalid sitemap feed');
      entries = data.items.map((item: { id: number; title?: string | null; lastModified?: string | null }) => {
        if (!Number.isSafeInteger(item.id) || item.id < 1) throw new Error('Invalid sitemap ID');
        if (kind === 'ads' && item.title !== null && typeof item.title !== 'string') throw new Error('Invalid ad title');
        const lastModified = kind === 'ads' && typeof item.lastModified === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.lastModified) ? item.lastModified : undefined;
        return { path: kind === 'ads' ? getAdPath({ id: item.id, title: item.title ?? 'Oglas bez naslova' }) : `/seller/${item.id}`, lastModified };
      });
    }
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="${namespace}">${entries.map(entry => `<url><loc>${absolute(entry.path)}</loc>${entry.lastModified ? `<lastmod>${escapeXml(entry.lastModified)}</lastmod>` : ''}</url>`).join('')}</urlset>`, { headers });
  } catch {
    return new Response('Sitemap temporarily unavailable', { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '60', 'X-Robots-Tag': 'noindex' } });
  }
}

export function robotsResponse() {
  try {
    return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${siteOrigin()}/sitemap.xml\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
  } catch { return new Response('Robots configuration unavailable', { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' } }); }
}
