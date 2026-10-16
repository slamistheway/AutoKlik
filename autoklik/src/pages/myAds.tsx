'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { AdStatusControls } from '@/components/ad-status-controls';
import type { AdCardData } from '@/types/types';
import { toAdCardData } from '@/shared/ad-data';
import { adStatusLabels, getAdStatus } from '@/shared/ad-status';
import { API_BASE_URL, getResponseMessage } from './myProfile/account-api';
import { sessionCookie } from '@/components/cookies/cookies';

export default function MyAdsPage() {
  const router = useRouter();
  const [ads, setAds] = useState<AdCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        const token = sessionCookie.getSessionToken();
        if (!token) {
          await router.replace('/login?returnUrl=%2FmyAds');
          return;
        }
        const response = await fetch(`${API_BASE_URL}/ads/me`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
        if (!response.ok) throw new Error(await getResponseMessage(response, 'Oglase nije moguće učitati.'));
        const data: unknown[] = await response.json();
        if (!controller.signal.aborted) setAds(data.map(toAdCardData));
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Oglase nije moguće učitati.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [router]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <section className="mx-auto max-w-5xl rounded-lg border border-gray-200 bg-white p-5 shadow-md">
          <h1 className="text-2xl font-bold text-gray-900">Moji oglasi</h1>
          <Link href="/myProfile" className="mt-2 inline-block text-sm underline">Moj profil</Link>
          {loading && <p className="mt-5">Učitavanje oglasa...</p>}
          {error && <p role="alert" className="mt-5 text-red-700">{error}</p>}
          {!loading && !error && !ads.length && <p className="mt-5">Nemate objavljenih oglasa.</p>}
          <div className="mt-5 space-y-4">
            {ads.map(ad => (
              <article key={ad.id} className="rounded-lg border border-gray-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Link href={`/ad/${ad.id}`} className="font-bold text-gray-900 hover:underline">{ad.title}</Link>
                  <span className="rounded-md bg-gray-100 px-3 py-1 text-sm">{adStatusLabels[getAdStatus(ad)]}</span>
                </div>
                {ad.expiresAt && <p className="mt-2 text-sm text-gray-500">Istek: {new Date(ad.expiresAt).toLocaleString('hr-HR')}</p>}
                <AdStatusControls ad={ad} onChange={updated => setAds(current => current.map(item => item.id === updated.id ? updated : item))} />
              </article>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
