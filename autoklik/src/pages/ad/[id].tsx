'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ChevronLeft, ChevronRight, Heart, MapPin, Share2 } from 'lucide-react';
import { Footer } from '@/components/footer';
import { Navbar } from '@/components/navbar';
import type { AdFullData } from '@/types/types';
import '../../app/globals.css';
import {resolve_api_ad_img} from "@/shared/functions";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type AdDetails = AdFullData & {
  category?: string | null;
  subcategory?: string | null;
  brand?: string | null;
  model?: string | null;
  description?: string | null;
  buy_or_lease?: string | null;
  gear_type?: string | null;
  color?: string | null;
  door_number?: number | null;
  driving_licence?: string | null;
  weight?: number | null;
  payload?: number | null;
  volume?: number | null;
};


function formatPrice(price?: number | string | null) {
  if (price === null || price === undefined || price === '') return 'Cijena na upit';
  return `${new Intl.NumberFormat('hr-HR').format(Number(price))} €`;
}

export default function AdPage() {
  const router = useRouter();
  const [ad, setAd] = useState<AdDetails | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [shareMessage, setShareMessage] = useState('');

  useEffect(() => {
    if (!router.isReady || typeof router.query.id !== 'string') return;
    const controller = new AbortController();

    const fetchAd = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/ads/${encodeURIComponent(router.query.id as string)}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.message ?? 'Oglas nije pronađen.');
        }

        const result = await response.json() as AdDetails;
        setAd(result);
        setErrorMessage('');
      } catch (error) {
        if (controller.signal.aborted) return;
        setErrorMessage(error instanceof Error ? error.message : 'Oglas se nije mogao učitati.');
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    void fetchAd();
    return () => controller.abort();
  }, [router.isReady, router.query.id]);

  const imagePaths = ad?.images?.length ? ad.images : ad?.preview_img ? [ad.preview_img] : [];
  const images = imagePaths.map(resolve_api_ad_img);
  const selectedImage = images[activeImage] ?? '/default_ad_img.png';

  const showPreviousImage = () => setActiveImage((current) => (current - 1 + images.length) % images.length);
  const showNextImage = () => setActiveImage((current) => (current + 1) % images.length);

  const shareAd = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareMessage('Poveznica je kopirana.');
    } catch {
      setShareMessage('Kopiranje poveznice nije uspjelo.');
    }
  };

  const detailRows: [string, string | number | null | undefined][] = ad ? [
    ['Kategorija', ad.category],
    ['Potkategorija', ad.subcategory],
    ['Marka', ad.brand],
    ['Model', ad.model],
    ['Godina', ad.year],
    ['Kilometraža', ad.mileage === null || ad.mileage === undefined ? null : `${new Intl.NumberFormat('hr-HR').format(ad.mileage)} km`],
    ['Gorivo', ad.fuel],
    ['Stanje', ad.condition],
    ['Mjenjač', ad.gear_type],
    ['Boja', ad.color],
    ['Broj vrata', ad.door_number],
    ['Županija', ad.county],
  ] : [];
  const details = detailRows.filter(([, value]) => value !== null && value !== undefined && value !== '');

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#111114] px-4 py-6 text-white sm:px-6 lg:py-10">
        <div className="mx-auto max-w-7xl">
          <Link href="/cars" className="mb-5 inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white">
            <ChevronLeft className="h-4 w-4" /> Natrag na oglase
          </Link>

          {isLoading && <div className="rounded-2xl border border-white/10 bg-[#1b1b20] p-8 text-gray-300">Učitavanje oglasa...</div>}
          {!isLoading && errorMessage && <div role="alert" className="rounded-2xl border border-red-400/30 bg-red-950/40 p-6 text-red-100">{errorMessage}</div>}

          {!isLoading && ad && (
            <>
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
                <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#1b1b20]">
                  <div className="relative aspect-[16/10] bg-white">
                    <Image
                      key={selectedImage}
                      src={selectedImage}
                      alt={ad.title || 'Fotografija vozila'}
                      fill
                      priority
                      unoptimized
                      sizes="(max-width: 1024px) 100vw, 68vw"
                      className="object-contain"
                      onError={(event) => { event.currentTarget.src = '/default_ad_img.png'; }}
                    />
                    <span className="absolute left-3 top-3 rounded-md bg-black/65 px-3 py-1 text-xs font-semibold text-white">
                      {images.length ? `${activeImage + 1} / ${images.length}` : 'Slika oglasa'}
                    </span>
                    {images.length > 1 && (
                      <>
                        <button type="button" onClick={showPreviousImage} aria-label="Prethodna slika" className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/70 text-white hover:bg-black">
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button type="button" onClick={showNextImage} aria-label="Sljedeća slika" className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/70 text-white hover:bg-black">
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </>
                    )}
                  </div>
                  {images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto p-3">
                      {images.map((image, index) => (
                        <button key={`${image}-${index}`} type="button" onClick={() => setActiveImage(index)} aria-label={`Prikaži sliku ${index + 1}`} className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 bg-white ${activeImage === index ? 'border-orange-500' : 'border-transparent'}`}>
                          <Image src={image} alt="" fill unoptimized sizes="96px" className="object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </section>

                <aside className="rounded-2xl border border-white/10 bg-[#1b1b20] p-5 lg:sticky lg:top-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-400">{ad.brand} {ad.model}</p>
                  <h1 className="mt-2 text-2xl font-bold leading-tight">{ad.title || 'Oglas bez naslova'}</h1>
                  <p className="mt-5 text-3xl font-extrabold text-white">{formatPrice(ad.price)}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    {ad.condition && <span className="rounded-full bg-orange-500/15 px-3 py-1 text-orange-300">{ad.condition}</span>}
                    {ad.seller_type && <span className="rounded-full bg-white/10 px-3 py-1 text-gray-200">{ad.seller_type}</span>}
                  </div>

                  <div className="my-5 border-t border-white/10" />
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <MapPin className="h-4 w-4 text-orange-500" /> {ad.county || 'Lokacija nije navedena'}
                  </div>
                  <div className="mt-5 rounded-xl bg-[#111114] p-4">
                    <p className="text-xs text-gray-400">Prodavatelj</p>
                    <p className="mt-1 font-semibold">{ad.seller_username || 'Privatni oglašivač'}</p>
                  </div>

                  <button type="button" className="mt-4 w-full rounded-xl bg-orange-600 px-4 py-3 font-bold text-white transition hover:bg-orange-500">
                    Pošalji poruku
                  </button>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setIsSaved((saved) => !saved)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2.5 text-sm text-gray-200 hover:bg-white/5">
                      <Heart className={`h-4 w-4 ${isSaved ? 'fill-orange-500 text-orange-500' : ''}`} /> {isSaved ? 'Spremljeno' : 'Spremi'}
                    </button>
                    <button type="button" onClick={shareAd} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2.5 text-sm text-gray-200 hover:bg-white/5">
                      <Share2 className="h-4 w-4" /> Podijeli
                    </button>
                  </div>
                  {shareMessage && <p role="status" className="mt-2 text-center text-xs text-gray-400">{shareMessage}</p>}
                </aside>
              </div>

              {ad.description && (
                  <section className="mt-5 rounded-2xl border border-white/10 bg-[#1b1b20] p-5 sm:p-6">
                    <h2 className="text-xl font-bold">Opis oglasa</h2>
                    <p className="mt-3 whitespace-pre-line leading-7 text-gray-300">{ad.description}</p>
                  </section>
              )}

              <section className="mt-5 rounded-2xl border border-white/10 bg-[#1b1b20] p-5 sm:p-6">
                <h2 className="text-xl font-bold">Pregled vozila</h2>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                      ['Godina', ad.year],
                      ['Kilometraža', ad.mileage === null || ad.mileage === undefined ? null : `${new Intl.NumberFormat('hr-HR').format(ad.mileage)} km`],
                      ['Gorivo', ad.fuel],
                      ['Snaga', ad.enginePower],
                      ['Mjenjač', ad.gear_type],
                      ['Prodavač', ad.seller_type]

                  ].filter(([, value]) => value !== null && value !== undefined && value !== '').map(([label, value]) => (
                    <div key={String(label)} className="rounded-xl bg-[#111114] p-4">
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className="mt-1 font-semibold text-gray-100">{value}</p>
                    </div>
                  ))}
                </div>
              </section>

              {details.length > 0 && (
                <section className="mt-5 rounded-2xl border border-white/10 bg-[#1b1b20] p-5 sm:p-6">
                  <h2 className="text-xl font-bold">Tehnički podaci</h2>
                  <dl className="mt-4 grid gap-x-8 sm:grid-cols-2">
                    {details.map(([label, value], index) => (
                      <div key={label} className={`flex justify-between gap-4 border-t border-white/10 px-3 py-3 text-sm ${index % 2 === 1 ? 'bg-[#151519]' : ''}`}>
                        <dt className="text-gray-400">{label}</dt>
                        <dd className="text-right font-medium text-gray-100">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
