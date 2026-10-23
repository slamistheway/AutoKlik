'use client';

import { ReportButton } from '@/components/report-button';

import { getAdPath } from '@/shared/ad-seo';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { AdCard } from '@/components/adCard';
import type { AdCardData, PublicSeller } from '@/types/types';
import { toAdCardData } from '@/shared/ad-data';
import { resolve_api_ad_img, resolve_api_pfp_img } from '@/shared/functions';
import { sessionCookie } from '@/components/cookies/cookies';
import { API_BASE_URL, getResponseMessage } from '@/lib/account-api';

type Summary = { total: number; active: number; sold: number; expired: number };
type Profile = { seller: PublicSeller; summary: Summary; total: number; pageSize: number; listings: AdCardData[] };
const filters = [{ value: 'all', label: 'Svi oglasi' }, { value: 'active', label: 'Aktivni' }, { value: 'sold', label: 'Prodani' }, { value: 'expired', label: 'Istekli' }];

export default function SellerProfilePage() {
  const router = useRouter();
  const id = typeof router.query.id === 'string' ? router.query.id : '';
  return <SellerProfile key={id} id={id} ready={router.isReady} />;
}

function SellerProfile({ id, ready }: { id: string; ready: boolean }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [result, setResult] = useState<{ key: string; profile?: Profile; error?: string } | null>(null);
  const key = `${id}:${status}:${page}`;

  useEffect(() => {
    if (!ready || !id) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        const token = sessionCookie.getSessionToken();
        const response = await fetch(`${API_BASE_URL}/ads/seller/${encodeURIComponent(id)}?page=${page}&status=${status}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}, signal: controller.signal,
        });
        if (!response.ok) throw new Error(await getResponseMessage(response, 'Profil prodavatelja nije moguće učitati.'));
        const data = await response.json() as Omit<Profile, 'listings'> & { listings: unknown[] };
        if (!controller.signal.aborted) setResult({ key, profile: { ...data, listings: data.listings.map(toAdCardData).map(ad => ({ ...ad, previewImg: resolve_api_ad_img(ad.previewImg) })) } });
      } catch (failure) {
        if (!controller.signal.aborted) setResult({ key, error: failure instanceof Error ? failure.message : 'Profil nije dostupan.' });
      }
    };
    void load();
    return () => controller.abort();
  }, [ready, id, page, status, key]);

  const profile = result?.key === key ? result.profile : undefined;
  const error = result?.key === key ? result.error : undefined;
  const totalPages = profile ? Math.max(1, Math.ceil(profile.total / profile.pageSize)) : 1;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-7xl">
          {!profile && !error && <p>Učitavanje profila prodavatelja...</p>}
          {error && <p role="alert" className="rounded-lg bg-red-50 p-5 text-red-700">{error}</p>}
          {profile && <>
            <section className="min-w-0 break-words rounded-xl border border-gray-200 bg-white p-4
              sm:p-6">
              <div className="flex flex-wrap items-center gap-5">
                <Image src={resolve_api_pfp_img(profile.seller.pfp)} alt="Profilna slika prodavatelja" width={88} height={88} unoptimized className="h-22 w-22 rounded-full object-cover" onError={event => { event.currentTarget.src = '/default-pfp.jpg'; }} />
                <div><p className="text-sm font-medium text-[#a4473b]">Profil prodavatelja</p><h1 className="mt-1 text-3xl font-bold text-gray-900">{profile.seller.username}</h1>
                  {[profile.seller.city, profile.seller.country].filter(Boolean).length > 0 && <p className="mt-2 text-sm text-gray-600">{[profile.seller.city, profile.seller.country].filter(Boolean).join(', ')}</p>}
                  {profile.seller.memberSince && <p className="mt-1 text-sm text-gray-500">Član od {new Date(profile.seller.memberSince).toLocaleDateString('hr-HR')}</p>}
                </div>
              </div>
              <ReportButton targetType="user" targetId={profile.seller.id} /><div className="mt-3 flex flex-wrap gap-2 text-xs text-[#a4473b]">{profile.seller.verified && <span>Provjeren prodavatelj</span>}{profile.seller.dealerStatus === 'approved' && <span>Provjeren trgovac</span>}{profile.seller.badges?.map(badge => <span key={badge}>{badge}</span>)}</div>{profile.seller.dealerProfile && <p className="mt-3 text-sm text-gray-600">{profile.seller.dealerProfile.businessName} · {profile.seller.dealerProfile.address}</p>}<p className="mt-5 text-gray-600">{profile.seller.username} ima {profile.summary.total} javno dostupnih oglasa, od kojih je {profile.summary.active} aktivno. Prodani i istekli oglasi prikazani su sa svojim statusom.</p>
              <dl className="mt-6 grid grid-cols-2 gap-3
                sm:grid-cols-4">{[{ label: 'Svi oglasi', value: profile.summary.total }, { label: 'Aktivni', value: profile.summary.active }, { label: 'Prodani', value: profile.summary.sold }, { label: 'Istekli', value: profile.summary.expired }].map(item => <div key={item.label} className="rounded-lg bg-gray-50 p-4"><dt className="text-sm text-gray-500">{item.label}</dt><dd className="mt-1 text-2xl font-bold text-gray-900">{item.value}</dd></div>)}</dl>
            </section>

            <section className="mt-8" aria-label="Oglasi prodavatelja">
              <h2 className="text-xl font-bold text-gray-900">Oglasi prodavatelja</h2>
              <div className="my-4 flex flex-wrap gap-2" aria-label="Filtriraj oglase">{filters.map(filter => <button key={filter.value} type="button" aria-pressed={status === filter.value} onClick={() => { setStatus(filter.value); setPage(1); }} className={`rounded-md border px-4 py-2 text-sm ${status === filter.value ? 'border-[#a4473b] bg-[#a4473b] text-white' : 'border-gray-300 bg-white text-gray-600'}`}>{filter.label}</button>)}</div>
              {!profile.listings.length ? <p className="rounded-lg border border-dashed border-gray-300 p-6 text-gray-500">Nema oglasa za odabrani prikaz.</p> : <div className="grid grid-cols-1 gap-4
                sm:grid-cols-2
                lg:grid-cols-4">{profile.listings.map(ad => <AdCard key={ad.id} ad={ad} href={getAdPath(ad)} />)}</div>}
              {totalPages > 1 && <nav aria-label="Stranice oglasa prodavatelja" className="mt-6 flex flex-wrap items-center justify-center gap-4">
                <button type="button" disabled={page <= 1} onClick={() => setPage(current => current - 1)} className="rounded-md border border-gray-300 px-4 py-2 disabled:opacity-50">Prethodna</button>
                <span>Stranica {page} / {totalPages}</span>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage(current => current + 1)} className="rounded-md border border-gray-300 px-4 py-2 disabled:opacity-50">Sljedeća</button>
              </nav>}
            </section>
          </>}
        </div>
      </main>
      <Footer />
    </>
  );
}
