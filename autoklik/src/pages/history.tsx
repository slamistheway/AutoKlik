'use client';

import { useEffect, useState } from 'react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { AdCard } from '@/components/adCard';
import type { AdCardData } from '@/types/types';
import { getRecentlyViewedIds, clearRecentlyViewed } from '@/lib/recently-viewed';
import { toAdCardData } from '@/shared/ad-data';
import { resolve_api_ad_img } from '@/shared/functions';
import { API_BASE_URL } from './myProfile/account-api';

const PAGE_SIZE = 20;

export default function HistoryPage() {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ page: number; total: number; ads: AdCardData[]; error: string } | null>(null);
  const [clearError, setClearError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      const ids = getRecentlyViewedIds();
      const pageIds = ids.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
      try {
        let ads: AdCardData[] = [];
        if (pageIds.length) {
          const response = await fetch(`${API_BASE_URL}/ads/recently-viewed?ids=${pageIds.join(',')}`, { signal: controller.signal });
          if (!response.ok) throw new Error('Povijest trenutno nije dostupna.');
          const data: unknown[] = await response.json();
          ads = data.map(toAdCardData).map(ad => ({ ...ad, previewImg: resolve_api_ad_img(ad.previewImg) }));
        }
        if (!controller.signal.aborted) setResult({ page, total: ids.length, ads, error: '' });
      } catch (failure) {
        if (!controller.signal.aborted) setResult({ page, total: ids.length, ads: [], error: failure instanceof Error ? failure.message : 'Povijest trenutno nije dostupna.' });
      }
    };
    void load();
    return () => controller.abort();
  }, [page]);

  const clearHistory = () => {
    try {
      clearRecentlyViewed();
      setResult({ page: 1, total: 0, ads: [], error: '' });
      setPage(1);
      setClearError('');
    } catch { setClearError('Povijest nije moguće obrisati.'); }
  };

  const loading = result?.page !== page;
  const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / PAGE_SIZE));

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <section className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Povijest pregledanih oglasa</h1>
            <button type="button" disabled={loading || !result?.total} onClick={clearHistory} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm disabled:opacity-50">Obriši povijest</button>
          </div>
          <p className="mt-2 text-sm text-gray-500">Svi oglasi zabilježeni u ovom pregledniku, od najnovije pregledanih. Obrisani i skriveni oglasi nisu prikazani.</p>
          {clearError && <p role="alert" className="mt-4 text-red-700">{clearError}</p>}
          {loading ? <p className="mt-6">Učitavanje povijesti...</p> : result?.error ? <p role="alert" className="mt-6 text-red-700">{result.error}</p> : (
            <>
              {!result?.total && <p className="mt-6 text-gray-600">Još niste pregledali nijedan oglas.</p>}
              {Boolean(result?.total) && !result?.ads.length && <p className="mt-6 text-gray-600">Oglasi na ovoj stranici više nisu dostupni.</p>}
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {result?.ads.map(ad => <AdCard key={ad.id} ad={ad} href={`/ad/${ad.id}`} />)}
              </div>
            </>
          )}
          {totalPages > 1 && <nav aria-label="Stranice povijesti" className="mt-6 flex items-center justify-center gap-4">
            <button type="button" disabled={loading || page === 1} onClick={() => setPage(current => current - 1)} className="rounded-md border border-gray-300 px-4 py-2 disabled:opacity-50">Prethodna</button>
            <span>Stranica {page} / {totalPages}</span>
            <button type="button" disabled={loading || page >= totalPages} onClick={() => setPage(current => current + 1)} className="rounded-md border border-gray-300 px-4 py-2 disabled:opacity-50">Sljedeća</button>
          </nav>}
        </section>
      </main>
      <Footer />
    </>
  );
}
