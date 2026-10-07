'use client';

import { useRouter as useAccountRouter } from 'next/router';
import type { ReactNode } from 'react';
import { Footer } from '@/components/footer';
import { Navbar } from '@/components/navbar';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { fetchCurrentUser } from '@/app/auth/auth-guards';
import type { AdCardData, CurrentUser } from '@/types/types';
import { API_BASE_URL, getResponseMessage } from './myProfile/account-api';
import {sessionCookie} from '@/components/cookies/cookies';
import {resolve_api_ad_img} from "@/shared/functions";



const PAGE_SIZE = 5;

type SavedAdResponse = {
  ad_id: number;
  user_id: number;
  category: string | null;
  subcategory: string | null;
  brand: string | null;
  model: string | null;
  title: string | null;
  description: string | null;
  year: number | null;
  preview_img: string | null;
  saved_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const accountNavigation = [
  { href: '/myProfile', label: 'Moj profil' },
  { href: '/myMessages', label: 'Poruke' },
  { href: '/mySavedAds', label: 'Spremljeni oglasi' },
  { href: '/mySettings', label: 'Postavke' },
];



function formatDate(date: string | Date | null) {
  if (!date) return '—';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? '—' : new Intl.DateTimeFormat('hr-HR').format(parsed);
}

export default function MySavedAds() {
  const router = useAccountRouter();

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');


  const [user, setUser] = useState<CurrentUser | null>(null);
  const [ads, setAds] = useState<AdCardData[]>([]);
  useEffect(() => {
    if (!router.isReady) return;
    let active = true;

    const fetchAll = async () => {
      try {
        const token = sessionCookie.getSessionToken();
        if (!token) {
          setError('Morate biti prijavljeni da biste vidjeli spremljene oglase.');
          await router.replace(`/login?returnUrl=${encodeURIComponent(router.asPath)}`);
          return;
        }

        const [currentUser, allAdsRes] = await Promise.all([
          fetchCurrentUser(),
          fetch(`${API_BASE_URL}/ads/me/saved`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!allAdsRes.ok) {
          const errBody = await allAdsRes.json().catch(() => ({}));
          throw new Error(errBody?.message ?? 'Neuspješno učitavanje spremljenih oglasa.');
        }

        const apiAds: SavedAdResponse[] = await allAdsRes.json();
        if (!active) return;
        setUser(currentUser);
        setAds(apiAds.map(ad => ({
          id: ad.ad_id,
          userId: ad.user_id,
          title: ad.title ?? 'Oglas bez naslova',
          year: ad.year,
          kilometrage: null,
          fuel: '',
          condition: '',
          county: '',
          sellerType: '',
          buyOrLease: '',
          gearType: '',
          color: '',
          doorNumber: null,
          drivingLicence: '',
          weight: null,
          payload: null,
          volume: null,
          category: ad.category ?? '',
          subcategory: ad.subcategory ?? '',
          brand: ad.brand ?? '',
          model: ad.model ?? '',
          description: ad.description ?? '',
          price: '',
          previewImg: resolve_api_ad_img(ad.preview_img),
          dateCreated: ad.created_at,
          dateLastUpdated: ad.updated_at,
          savedAt: ad.saved_at,
          is_saved: true,
        })));
        setError('');
        
      } catch (err: unknown) {
        if (active) setError(err instanceof Error ? err.message : 'Neuspješno učitavanje spremljenih oglasa.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchAll();
    return () => { active = false; };
  }, [router.asPath, router.isReady]);




  const totalPages = Math.ceil(ads.length / PAGE_SIZE);
  const pageNumbers = useMemo(() => Array.from({ length: totalPages }, (_, index) => index + 1), [totalPages]);
  const pagedAds = ads.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const removeSavedAd = async (adId: number) => {
    const token = sessionCookie.getSessionToken();
    if (!token) {
      setError('Sesija je istekla. Prijavite se ponovo.');
      return;
    }
    setActionMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/ads/save/${adId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(await getResponseMessage(response, 'Nije moguće ukloniti oglas.'));
      setAds(current => current.filter(ad => ad.id !== adId));
      setPage(current => Math.min(current, Math.max(1, Math.ceil((ads.length - 1) / PAGE_SIZE))));
      setActionMessage('Oglas je uklonjen iz spremljenih.');
    } catch (removeError) {
      setActionMessage(removeError instanceof Error ? removeError.message : 'Nije moguće ukloniti oglas.');
    }
  };

  return (
      <>
        <header>
          <Navbar />
        </header>

        <main className="min-h-screen bg-gray-50 px-4 py-10"><div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row">
          <aside className="h-fit w-full shrink-0 rounded-lg border border-gray-200 bg-white p-4 shadow-md md:w-56"><nav aria-label="Korisnički izbornik" className="flex flex-col gap-2">
            {accountNavigation.map(item => <Link key={item.href} href={item.href} aria-current={router.pathname === item.href ? 'page' : undefined} className={`rounded px-3 py-2 text-sm font-medium transition ${router.pathname === item.href ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-blue-100 hover:text-blue-700'}`}>{item.label}</Link>)}
          </nav></aside>
          <section className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white p-5 shadow-md sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Spremljeni oglasi</h1>
                {user && <p className="mt-1 text-sm text-gray-600">Prikaz oglasa za {user.username}</p>}
              </div>
            </div>

            {loading ? (
                <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">Učitavanje oglasa...</div>
            ) : error ? (
                <p role="alert" className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
            ) : ads.length === 0 ? (
                <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">Nemate spremljenih oglasa.</div>
            ) : (
                <>
                  {totalPages > 1 && (
                      <nav aria-label="Stranice spremljenih oglasa" className="mt-5 flex justify-center gap-1">
                        <button type="button" onClick={() => setPage(current => Math.max(1, current - 1))} disabled={page <= 1} className="h-10 w-10 border-2 disabled:opacity-50" aria-label="Prethodna stranica">←</button>
                        {pageNumbers.map(pageNumber => (
                            <button key={pageNumber} type="button" onClick={() => setPage(pageNumber)} aria-current={page === pageNumber ? 'page' : undefined} className={`h-10 w-10 border-2 ${page === pageNumber ? 'bg-[var(--color-navbar)] text-white' : ''}`}>
                              {pageNumber}
                            </button>
                        ))}
                        <button type="button" onClick={() => setPage(current => Math.min(totalPages, current + 1))} disabled={page >= totalPages} className="h-10 w-10 border-2 disabled:opacity-50" aria-label="Sljedeća stranica">→</button>
                      </nav>
                  )}

                  <div className="mt-5 space-y-4">
                    {pagedAds.map(ad => (
                        <article key={ad.id} className="flex overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
                          <Link href={`/ad/${ad.id}`} className="relative h-40 w-36 shrink-0 overflow-hidden bg-gray-100 sm:h-44 sm:w-48">
                            <Image src={ad.previewImg} alt={ad.title || 'Slika oglasa'} fill sizes="(max-width: 640px) 144px, 192px" unoptimized={ad.previewImg === '/default_ad_img.png' || /^https?:\/\//i.test(ad.previewImg)} className="object-cover" />
                          </Link>
                          <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
                            <span className="text-xs font-medium text-gray-600">{ad.category ?? 'Oglas'}{ad.subcategory ? ` > ${ad.subcategory}` : ''}</span>
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <Link href={`/ad/${ad.id}`} className="line-clamp-2 text-base font-bold text-gray-900 hover:text-[var(--color-navbar)]">
                                  {ad.title || 'Oglas bez naslova'}
                                </Link>
                                <p className="mt-1 text-xs text-gray-500">{ad.brand} {ad.model}</p>
                                <p className="mt-1 text-xs text-gray-500">Godište: {ad.year ?? '—'}</p>
                              </div>
                              <button type="button" onClick={() => void removeSavedAd(ad.id)} aria-label="Ukloni iz spremljenih oglasa" className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-lg transition hover:bg-red-50">
                                ❤️
                              </button>
                            </div>
                            <div className="mt-auto border-t border-gray-100 pt-2 text-xs text-gray-500">Spremljeno: {formatDate(ad.savedAt || null)}</div>
                          </div>
                        </article>
                    ))}
                  </div>
                  {actionMessage && <p role="status" className="mt-4 text-sm text-gray-700">{actionMessage}</p>}
                </>
            )}
          </section>
        </div></main>
        <Footer />
      </>

  );
}
