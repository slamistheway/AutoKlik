import { ReportButton } from '@/components/report-button';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Head from 'next/head';
import type { GetServerSidePropsContext } from 'next';
import { getAdPageProps, type AdPageProps } from '@/server/ad-page-props';
import { getAdSeo, serializeStructuredData } from '@/shared/ad-seo';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ChevronLeft, ChevronRight, MapPin, Share2 } from 'lucide-react';
import { AdLocationMap } from '@/components/ad-location-map';
import { Footer } from '@/components/footer';
import { Navbar } from '@/components/navbar';
import { AdStatusControls } from '@/components/ad-status-controls';
import { adStatusLabels, getAdStatus } from '@/shared/ad-status';
import { recordAdView } from '@/lib/recently-viewed';
import { CompareAdButton } from '@/components/compare-controls';
import { SaveAdButton } from '@/components/saveAdButton';
import type { AdFullData, CurrentUser } from '@/types/types';
import {sessionCookie} from '@/components/cookies/cookies';
import {resolve_api_ad_img} from "@/shared/functions";
import {fetchCurrentUser} from "@/app/auth/auth-guards";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function formatPrice(price?: number | string | null) {
  if (price === null || price === undefined || price === '') return 'Cijena na upit';
  return `${new Intl.NumberFormat('hr-HR').format(Number(price))} €`;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  return getAdPageProps(context);
}

export default function AdPage(props: AdPageProps) {
  return <AdPageContent key={props.initialAd?.id ?? 'unavailable'} {...props} />;
}

function AdPageContent({initialAd, siteUrl, initialError}: AdPageProps) {
  const router = useRouter();
  const [activeImage, setActiveImage] = useState(0);
  const [errorMessage, setErrorMessage] = useState(initialError);
  const [shareMessage, setShareMessage] = useState('');


  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);


  const [ad, setAd] = useState<AdFullData | null>(initialAd);

  const imagePaths = ad?.images.length ? ad.images : ad?.previewImg ? [ad.previewImg] : [];
  const images = imagePaths.map(resolve_api_ad_img);
  const selectedImage = images[activeImage] ?? '/default_ad_img.png';

  const showPreviousImage = () => setActiveImage((current) => (current - 1 + images.length) % images.length);
  const showNextImage = () => setActiveImage((current) => (current + 1) % images.length);


  useEffect(() => {
    if (initialAd) recordAdView(initialAd.id);
    let active = true;
    if (sessionCookie.getSessionToken()) {
      void fetchCurrentUser().then(user => { if (active) setCurrentUser(user); }).catch(() => {});
    }
    return () => { active = false; };
  }, [initialAd]);

  useEffect(() => {
    if (!ad?.expiresAt || ad.status !== 'active') return;
    const remaining = Date.parse(ad.expiresAt) - Date.now();
    const timer = window.setTimeout(() => setAd(current => current?.id === ad.id && current.status === 'active' ? { ...current, status: 'expired' } : current), Math.max(0, remaining));
    return () => window.clearTimeout(timer);
  }, [ad?.id, ad?.status, ad?.expiresAt]);

  useEffect(() => {
    const token = sessionCookie.getSessionToken();
    const adId = ad?.id;
    if (!adId || !token) return;
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/ads/${adId}/view`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
    }).then(async response => {
      if (!response.ok) return;
      const result: { viewCount: number } = await response.json();
      if (!controller.signal.aborted && Number.isSafeInteger(result.viewCount) && result.viewCount >= 0) {
        setAd(current => current?.id === adId ? { ...current, viewCount: result.viewCount } : current);
      }
    }).catch(() => {});
    return () => controller.abort();
  }, [ad?.id]);

  const shareAd = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareMessage('Poveznica je kopirana.');
    } catch {
      setShareMessage('Kopiranje poveznice nije uspjelo.');
    }
  };



  const deleteAd = (adId: number, setErrorMessage: (msg: string) => void) => {
    const token = sessionCookie.getSessionToken();
    if (!token) {
      console.warn('User is not authenticated. Cannot delete ad.');
      return;
    }

    fetch(`http://localhost:3001/ads/delete/${adId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ arg_adID: adId }),
    }).then(async (res) => {
        if (!res.ok) {
          throw new Error(res?.statusText ?? 'Brisanje oglasa nije uspjelo.');
        }

        void router.push('/');

    }).catch((err) => {
      setErrorMessage(err?.message);
    });
  };


  function goToMessageUser(id: CurrentUser['id'] | undefined, username: string | undefined) {
    if (id === undefined || username === undefined) return;

    console.log(`Going to message user: ${id}, ${username}`);
    
    if (Number(id) !== Number(currentUser?.id)) {
      localStorage.setItem('goToMessageUserID', id.toString());
      localStorage.setItem('goToMessageUserUsername', username);
    }
    router.push('/myMessages');
  }


  const seo = ad ? getAdSeo(ad, siteUrl) : null;

  return (
    <>
      <Head>
        <title>{seo?.title ?? 'Oglas nije dostupan | AutoKlik'}</title>
        <meta name="description" content={seo?.description ?? initialError} key="description" />
        <meta name="robots" content={!ad || ad.status === 'hidden' ? 'noindex, nofollow' : 'index, follow'} key="robots" />
        {seo && <link rel="canonical" href={seo.url} key="canonical" />}
        {seo && <meta property="og:type" content="website" key="og:type" />}
        {seo && <meta property="og:site_name" content="AutoKlik" key="og:site_name" />}
        {seo && <meta property="og:locale" content="hr_HR" key="og:locale" />}
        {seo && <meta property="og:title" content={seo.title} key="og:title" />}
        {seo && <meta property="og:description" content={seo.description} key="og:description" />}
        {seo && <meta property="og:url" content={seo.url} key="og:url" />}
        {seo?.image && <meta property="og:image" content={seo.image} key="og:image" />}
        {seo?.image && <meta property="og:image:alt" content={ad?.title} key="og:image:alt" />}
        {seo && <meta name="twitter:card" content="summary_large_image" key="twitter:card" />}
        {seo && <meta name="twitter:title" content={seo.title} key="twitter:title" />}
        {seo && <meta name="twitter:description" content={seo.description} key="twitter:description" />}
        {seo?.image && <meta name="twitter:image" content={seo.image} key="twitter:image" />}
        {seo && ad?.status !== 'hidden' && <script type="application/ld+json" key="ad-structured-data"
          dangerouslySetInnerHTML={{__html: serializeStructuredData(seo.structuredData)}} />}
      </Head>
      <Navbar />
      <main className="min-h-screen bg-[#111114] px-4 py-6 text-white
        sm:px-6
        lg:py-10">
          <div className="mx-auto max-w-7xl">
          {errorMessage && <div role="alert" className="rounded-2xl border border-red-400/30 bg-red-950/40 p-6 text-red-100">{errorMessage}</div>}

          {ad && (
            <>
              <div className="grid min-w-0 gap-5
                lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
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

                <aside className="min-w-0 break-words rounded-2xl border border-white/10 bg-[#1b1b20] p-5
                  lg:sticky lg:top-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-400">{ad.brand} {ad.model}</p>
                  <h1 className="mt-2 text-2xl font-bold leading-tight">{ad.title || 'Oglas bez naslova'}</h1>
                  <p role="status" className="mt-3 text-sm font-semibold text-orange-300">{adStatusLabels[getAdStatus(ad)]}{getAdStatus(ad) !== 'active' ? ' — oglas nije dostupan za upite.' : ''}</p>
                  {ad.userId === Number(currentUser?.id) && <AdStatusControls ad={ad} onChange={updated => setAd(current => current ? { ...current, ...updated } : current)} />}
                  <p className="mt-5 text-3xl font-extrabold text-white">{formatPrice(ad.price)}</p>
                  <p className="mt-2 text-sm text-gray-400">Pregledi: {ad.viewCount ?? 0}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    {ad.condition && <span className="rounded-full bg-orange-500/15 px-3 py-1 text-orange-300">{ad.condition}</span>}
                    {ad.sellerType && <span className="rounded-full bg-white/10 px-3 py-1 text-gray-200">{ad.sellerType}</span>}
                  </div>

                  <div className="my-5 border-t border-white/10" />
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <MapPin className="h-4 w-4 text-orange-500" /> {ad.county || 'Lokacija nije navedena'}
                  </div>
                  <div className="mt-5 rounded-xl bg-[#111114] p-4">
                    <p className="text-xs text-gray-400">Prodavatelj</p>
                    <Link href={`/seller/${ad.userId}`} className="mt-1 block font-semibold underline hover:text-orange-300">{ad.sellerUsername || 'Privatni oglašivač'}</Link><ReportButton targetType="ad" targetId={ad.id} />
                    <Link href={`/seller/${ad.userId}`} className="mt-2 inline-block text-xs text-orange-400 hover:underline">Pogledaj profil i sve oglase</Link>
                  </div>

                  { getAdStatus(ad) === 'active' && ad.userId !== Number(currentUser?.id) &&
                    <button type="button" onClick={() => goToMessageUser(ad.userId, ad.sellerUsername ?? undefined)} className="mt-4 w-full rounded-xl bg-orange-600 px-4 py-3 font-bold text-white transition hover:bg-orange-500">
                      Pošalji poruku
                    </button>
                  }

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <SaveAdButton
                        adId={ad.id ?? Number(router.query.id)}
                        checkSavedOnMount
                        variant="heart"
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2.5 text-sm text-gray-200 hover:bg-white/5"
                    />

                    {ad.userId === Number(currentUser?.id) && (
                      <button type="button" onClick={() => { void router.push(`/ad/edit/${ad.id}`); }} className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-3 py-2.5 text-sm text-white hover:bg-blue-700">Uredi oglas</button>
                    )}
                    {ad.userId === currentUser?.id && (
                      <button type="button" onClick={() => deleteAd(ad.id, setErrorMessage)} className="bg-red-500 inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2.5 text-sm text-gray-200 hover:bg-white/5">
                        Delete
                      </button>
                    )}

                    <button type="button" onClick={shareAd} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2.5 text-sm text-gray-200 hover:bg-white/5">
                      <Share2 className="h-4 w-4" /> Podijeli
                    </button>
                  </div>
                  <CompareAdButton adId={ad.id} className="mt-3" />
                  {shareMessage && <p role="status" className="mt-2 text-center text-xs text-gray-400">{shareMessage}</p>}
                </aside>
              </div>

              <AdLocationMap location={ad.county} />

              {ad.description && (
                  <section className="mt-5 rounded-2xl border border-white/10 bg-[#1b1b20] p-5
                    sm:p-6">
                    <h2 className="text-xl font-bold">Opis oglasa</h2>
                    <p className="mt-3 break-words whitespace-pre-line leading-7 text-gray-300">{ad.description}</p>
                  </section>
              )}

              <section className="mt-5 rounded-2xl border border-white/10 bg-[#1b1b20] p-5
                sm:p-6">
                <h2 className="text-xl font-bold">Pregled vozila</h2>
                <div className="mt-4 grid grid-cols-2 gap-3
                  sm:grid-cols-4">
                  {[
                      ['Godina', ad.year],
                      ['Kilometraža', ad.kilometrage],
                      ['Gorivo', ad.fuel],
                      ['Vrsta pogona', ad.driveType],
                      ['Broj brzina', ad.gearCount],
                      ['Potrošnja goriva', ad.fuelConsumption == null ? null : `${ad.fuelConsumption} L/100 km`],
                      ['Jamstvo', ad.warranty],
                      /*['Mjenjač', ad.gearType],*/
                      ['Prodavač', ad.sellerType]

                  ].filter(([, value]) => value !== null && value !== undefined && value !== '').map(([label, value]) => (
                    <div key={String(label)} className="min-w-0 break-words rounded-xl bg-[#111114] p-4">
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className="mt-1 font-semibold text-gray-100">{value}</p>
                    </div>
                  ))}
                </div>
              </section>

            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
