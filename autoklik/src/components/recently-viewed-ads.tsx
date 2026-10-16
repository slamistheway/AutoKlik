'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdsCarousel } from '@/components/AdsCarousel';
import type { AdCardData } from '@/types/types';
import { getRecentlyViewedIds, clearRecentlyViewed } from '@/lib/recently-viewed';
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

  const clearHistory = () => {
    try {
      clearRecentlyViewed();
      setAds([]);
      setError('');
    } catch { setError('Povijest nije moguće obrisati.'); }
  };

  if (!ads.length && !error) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 pt-10">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-(--color-navbar) sm:text-2xl">Nedavno pregledani oglasi</h2>
        <div className="flex gap-3">
          <Link href="/history" className="text-sm underline">Cijela povijest</Link>
          <button type="button" onClick={clearHistory} className="text-sm underline">Obriši povijest</button>
        </div>
      </div>
      <p className="mt-1 text-sm text-gray-500">Posljednjih 10 oglasa pregledanih u ovom pregledniku.</p>
      <AdsCarousel ads={ads} errorMessage={error} rows={1} />
    </section>
  );
}
