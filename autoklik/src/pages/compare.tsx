'use client';

import { getAdPath } from '@/shared/ad-seo';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { CompareAdButton } from '@/components/compare-controls';
import { clearComparisonAds, useComparisonIds } from '@/lib/compare-ads';
import type { AdCardData } from '@/types/types';
import { toAdCardData } from '@/shared/ad-data';
import { resolve_api_ad_img } from '@/shared/functions';
import { adStatusLabels, getAdStatus } from '@/shared/ad-status';
import { API_BASE_URL } from '@/lib/account-api';

const valueLabels: Record<string, string> = {
  diesel: 'Dizel', petrol: 'Benzin', electric: 'Električni', hybrid: 'Hibrid', lpg: 'LPG',
  automatic: 'Automatski', manual: 'Ručni', semi_automatic: 'Poluautomatski',
  condition_used: 'Rabljeno', condition_new: 'Novo', used: 'Rabljeno', new: 'Novo',
};
const displayValue = (value: string) => valueLabels[value] ?? value;

const rows: { label: string; value: (ad: AdCardData) => string | number | null }[] = [
  { label: 'Cijena', value: ad => ad.price === '' ? 'Na upit' : `${new Intl.NumberFormat('hr-HR').format(Number(ad.price))} €` },
  { label: 'Pregledi', value: ad => ad.viewCount ?? 0 },
  { label: 'Status', value: ad => adStatusLabels[getAdStatus(ad)] },
  { label: 'Marka', value: ad => ad.brand },
  { label: 'Model', value: ad => ad.model },
  { label: 'Godina', value: ad => ad.year },
  { label: 'Kilometraža', value: ad => ad.kilometrage === null ? null : `${new Intl.NumberFormat('hr-HR').format(ad.kilometrage)} km` },
  { label: 'Snaga motora', value: ad => ad.enginePower === null ? null : `${ad.enginePower} kW` },
  { label: 'Gorivo', value: ad => displayValue(ad.fuel) },
  { label: 'Vrsta pogona', value: ad => ad.driveType ?? null },
  { label: 'Broj brzina', value: ad => ad.gearCount ?? null },
  { label: 'Potrošnja goriva', value: ad => ad.fuelConsumption == null ? null : `${ad.fuelConsumption} L/100 km` },
  { label: 'Jamstvo', value: ad => ad.warranty ?? null },
  { label: 'Mjenjač', value: ad => displayValue(ad.gearType) },
  { label: 'Stanje', value: ad => displayValue(ad.condition) },
  { label: 'Boja', value: ad => ad.color },
  { label: 'Broj vrata', value: ad => ad.doorNumber },
  { label: 'Lokacija', value: ad => ad.county },
  { label: 'Prodavatelj', value: ad => ad.sellerUsername || ad.sellerType },
];

export default function ComparePage() {
  const ids = useComparisonIds();
  const key = ids.join(',');
  const [result, setResult] = useState<{ key: string; ads: AdCardData[]; error: string } | null>(null);
  const [clearError, setClearError] = useState('');

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/ads/recently-viewed?ids=${key}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Oglase za usporedbu nije moguće učitati.');
        const data: unknown[] = await response.json();
        if (!controller.signal.aborted) setResult({ key, ads: data.map(toAdCardData), error: '' });
      }).catch(failure => {
        if (!controller.signal.aborted) setResult({ key, ads: [], error: failure instanceof Error ? failure.message : 'Usporedba trenutno nije dostupna.' });
      });
    return () => controller.abort();
  }, [key]);

  const clear = () => {
    try { clearComparisonAds(); setClearError(''); }
    catch (failure) { setClearError(failure instanceof Error ? failure.message : 'Odabir nije moguće obrisati.'); }
  };
  const loading = Boolean(key) && result?.key !== key;
  const ads = result?.key === key ? result.ads : [];

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <section className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Usporedba oglasa ({ids.length}/3)</h1>
            {ids.length > 0 && <button type="button" onClick={clear} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm">Ukloni sve</button>}
          </div>
          <p className="mt-2 text-sm text-gray-600">Odaberite do 3 oglasa pomoću gumba Usporedi na karticama ili stranici oglasa. Odabir se čuva u ovom pregledniku.</p>
          <Link href="/search" className="mt-4 inline-block font-medium text-[#a4473b] underline">Pronađi oglase za usporedbu</Link>
          {clearError && <p role="alert" className="mt-4 text-red-700">{clearError}</p>}
          {!key ? <p className="mt-8 rounded-lg border border-dashed border-gray-300 bg-white p-6 text-gray-600">Još niste odabrali oglase za usporedbu.</p> : loading ? <p className="mt-8">Učitavanje usporedbe...</p> : result?.error ? <p role="alert" className="mt-8 text-red-700">{result.error}</p> : (
            <div className="relative mt-6 overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="w-full border-collapse text-left text-sm">
                <caption className="sr-only">Usporedba odabranih vozila</caption>
                <thead><tr><th scope="col" className="min-w-32 border-b border-gray-200 p-4 align-bottom text-gray-500">Podaci o vozilu</th>{ids.map(id => {
                  const ad = ads.find(item => item.id === id);
                  return <th key={id} scope="col" className="min-w-56 border-b border-l border-gray-200 p-4 align-top font-normal">
                    {ad ? <><Link href={getAdPath(ad)} className="block"><div className="relative mb-3 aspect-[16/10] overflow-hidden rounded-md bg-gray-100"><Image src={resolve_api_ad_img(ad.previewImg)} alt={ad.title} fill unoptimized sizes="300px" className="object-cover" onError={event => { event.currentTarget.src = '/default_ad_img.png'; }} /></div><span className="font-bold text-gray-900 hover:underline">{ad.title}</span></Link></> : <p className="mb-3 text-gray-600">Oglas #{id} više nije dostupan.</p>}
                    <CompareAdButton adId={id} className="mt-3" />
                  </th>;
                })}</tr></thead>
                <tbody>{rows.map(row => <tr key={row.label} className="odd:bg-gray-50"><th scope="row" className="border-b border-gray-100 p-4 font-medium text-gray-600">{row.label}</th>{ids.map(id => {
                  const ad = ads.find(item => item.id === id);
                  const value = ad ? row.value(ad) : null;
                  return <td key={id} className="border-b border-l border-gray-100 p-4 text-gray-900">{value === null || value === '' ? '—' : value}</td>;
                })}</tr>)}</tbody>
              </table>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
