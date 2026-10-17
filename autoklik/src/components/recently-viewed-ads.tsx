'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdsCarousel } from '@/components/AdsCarousel';
import type { AdCardData } from '@/types/types';
import { getRecentlyViewedIds } from '@/lib/recently-viewed';
import { toAdCardData } from '@/shared/ad-data';
import { resolve_api_ad_img } from '@/shared/functions';
import { API_BASE_URL } from '@/pages/myProfile/account-api';

export function RecentlyViewedAds() {
  const [ads, setAds] = useState<AdCardData[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const ids = getRecentlyViewedIds().slice(0, 10);
    if (!ids.length) return;
    fetch(`${API_BASE_URL}/ads/recently-viewed?ids=${ids.join(',')}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Unavailable');
        const data: unknown[] = await response.json();
        if (!controller.signal.aborted) setAds(data.map(toAdCardData).map(ad => ({ ...ad, previewImg: resolve_api_ad_img(ad.previewImg) })));
      }).catch(() => { if (!controller.signal.aborted) setError('Nedavno pregledani oglasi trenutno nisu dostupni.'); });
    return () => controller.abort();
  }, []);

  if (!ads.length && !error) return null;
  return (
    <section className="mx-auto min-w-0 max-w-7xl px-4 pt-6
      sm:px-6 sm:pt-10
      lg:px-8 lg:pt-12">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="min-w-0 text-lg font-bold tracking-tight text-slate-900
          sm:text-xl
          lg:text-2xl">Nedavno pregledani oglasi</h2>
        <div className="shrink-0">
          <Link href="/history" className="inline-flex min-h-11 items-center text-sm font-semibold text-red-900 hover:underline">Cijela povijest</Link>
        </div>
      </div>
      <p className="mt-1 text-sm text-gray-500">Posljednjih 10 oglasa pregledanih u ovom pregledniku.</p>
      <AdsCarousel ads={ads} errorMessage={error} rows={1} />
    </section>
  );
}
