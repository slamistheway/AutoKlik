import type { GetServerSideProps } from 'next';
import type { AdFullData } from '@/types/types';
import { toAdFullData } from '@/shared/ad-data';
import { getAdPath } from '@/shared/ad-seo';

export type AdPageProps = {initialAd: AdFullData | null; siteUrl: string; initialError: string};

export const getAdPageProps: GetServerSideProps<AdPageProps> = async ({params, req, res}) => {
  res.setHeader('Cache-Control', 'private, no-store');
  const id = params?.id;
  if (typeof id !== 'string' || !/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) return {notFound: true};
  const siteUrl = new URL(process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').origin;
  const apiUrl = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/+$/, '');
  const token = req.cookies['autoklik.betterAuthSession'];
  try {
    const response = await fetch(`${apiUrl}/ads/${Number(id)}`, {
      headers: token ? {Authorization: `Bearer ${token}`} : {}, cache: 'no-store', signal: AbortSignal.timeout(10000),
    });
    if ([400, 401, 403, 404].includes(response.status)) return {notFound: true};
    if (!response.ok) throw new Error('Ad API unavailable');
    const initialAd = toAdFullData(await response.json());
    const destination = getAdPath(initialAd);
    const slug = params?.slug;
    if (id !== String(initialAd.id) || slug !== destination.split('/')[3]) {
      return {redirect: {destination, permanent: slug === undefined}};
    }
    if (initialAd.status === 'hidden') res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    return {props: {initialAd, siteUrl, initialError: ''}};
  } catch {
    res.statusCode = 503;
    res.setHeader('Retry-After', '60');
    res.setHeader('X-Robots-Tag', 'noindex');
    return {props: {initialAd: null, siteUrl, initialError: 'Oglas trenutačno nije dostupan. Pokušajte ponovno kasnije.'}};
  }
};
