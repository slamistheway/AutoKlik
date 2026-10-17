'use client';

import Link from "next/link";
import { RecentlyViewedAds } from '@/components/recently-viewed-ads';
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import {
  ArrowRightIcon,
  Bike,
  Car,
  CarFront,
  Gauge,
  History,
  Mountain,
  Truck,
  Wind,
  Wrench,
  Zap
} from 'lucide-react'
import './globals.css';
import {type FormEvent, useEffect, useState} from "react";
import { API_BASE_URL } from "@/pages/myProfile/account-api";
import {sessionCookie} from '@/components/cookies/cookies';
import type {AdCardData} from "@/types/types";
import {toAdCardData} from '@/shared/ad-data';
import {resolve_api_ad_img} from "@/shared/functions";
import {AdsCarousel} from "@/components/AdsCarousel";
import Image from "next/image";
import FilterBrands from '@/components/filters/filter-brands';
import FilterModels from '@/components/filters/filter-models';
import FilterNumeric from '@/components/filters/filter-numeric';
import {fetchCurrentUser} from '@/app/auth/auth-guards';
import {AdvancedSearchModal} from '@/components/advanced-search-modal';


type SearchFilters = {
  brand: string;
  model: string;
  yearMin: string;
  yearMax: string;
};

const emptyFilters: SearchFilters = { brand: '', model: '', yearMin: '', yearMax: '' };

// Tailwind groups: base/mobile first, then one line per breakpoint in ascending order.
const sectionClass = `mx-auto min-w-0 max-w-7xl px-4 pt-6
  sm:px-6 sm:pt-10
  lg:px-8 lg:pt-12`;
const sectionTitleClass = `min-w-0 text-lg font-bold text-[var(--color-navbar)]
  sm:text-xl
  lg:text-2xl`;
const sectionLinkClass = `inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-bold text-[var(--color-navbar)] underline transition hover:text-[var(--color-text)]
  sm:text-base`;

export default function Home() {
  const [currentUserId, setCurrentUserId] = useState<number | string | null>();
  const [featuredAds, setFeaturedAds] = useState<AdCardData[]>([]);
  const [recommendedAds, setRecommendedAds] = useState<AdCardData[]>([]);
  const [featuredError, setFeaturedError] = useState('');
  const [recommendedError, setRecommendedError] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<SearchFilters>(emptyFilters);
  const [filterError, setFilterError] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState<Record<string, string> | null>(null);


  const startCategories = [
    { label: "Automobili", href: "/search?category=cars",            icon: Car,      bg: "bg-[#dfeaf6]" },
    { label: "Motocikli", href: "/search?category=motorcycle",             icon: Bike,     bg: "bg-[#f8dcd2]" },
    { label: "Dijelovi", href: "/search?search=dijelovi",              icon: Wrench,   bg: "bg-[#f8e6cf]" },
    { label: "Električni automobili", href: "/search?category=cars&fuel=electric", icon: Zap,      bg: "bg-[#dcf0e0]" },
    { label: "Športski motocikli", href: "/search?category=motorcycle&subcategory=sports_motorcycle",    icon: Gauge,    bg: "bg-[#f9d9db]" },
    { label: "Kamioni", href: "/search?category=other&subcategory=truck",               icon: Truck,    bg: "bg-[#d6e4f4]" },
    { label: "Oldtimeri", href: "/search?category=cars&search=oldtimer",             icon: History,  bg: "bg-[#ecd9e6]" },
    { label: "SUV vozila", href: "/search?category=cars&search=SUV",            icon: CarFront, bg: "bg-[#f7dccf]" },
    { label: "Skuteri", href: "/search?category=motorcycle&subcategory=scooter_motorcycle",               icon: Wind,     bg: "bg-[#e6e1f5]" },
    { label: "ATV / Quad", href: "/search?category=motorcycle&subcategory=quad_motorcycle",            icon: Mountain, bg: "bg-[#d3e0ef]" },
  ];

  const startBrands = [
    {name: 'Alfa Romeo', logo: '/brands/alfa-romeo-logo-2015.png'},
    {name: 'Audi', logo: '/brands/audi-logo-2016.png'},
    {name: 'BMW', logo: '/brands/bmw-logo-1997.png'},
    {name: 'BYD', logo: '/brands/byd-logo-2022.png'},
    {name: 'Dacia', logo: '/brands/dacia-logo-2015.png'},
    {name: 'Fiat', logo: '/brands/fiat-logo-2006.png'},
    {name: 'Ford', logo: '/brands/ford-logo-2003.png'},
    {name: 'Mazda', logo: '/brands/mazda-logo-2018.v.png'},
    {name: 'Nissan', logo: '/brands/nissan-logo-2012.png'},
    {name: 'Renault', logo: '/brands/renault-logo-2015.png'},
    {name: 'Škoda', logo: '/brands/skoda-logo-1999.png'},
    {name: 'Toyota', logo: '/brands/toyota-logo-2005.png'},
    {name: 'Volkswagen', logo: '/brands/volkswagen-logo-2012.png'},
    {name: 'Volvo', logo: '/brands/volvo-logo-2013.png'},
  ];


  useEffect(() => {
    let active = true;
    if (!sessionCookie.getSessionToken()) {
      Promise.resolve().then(() => { if (active) setCurrentUserId(null); });
    } else {
      void fetchCurrentUser().then(user => {
        if (active) setCurrentUserId(user.id);
      }).catch(() => undefined);
    }
    return () => { active = false; };
  }, []);


  useEffect(() => {
    const controller = new AbortController();
    let recommendationController = new AbortController();
    const token = sessionCookie.getSessionToken();
    const fetchAds = async (
      path: string,
      setAds: (ads: AdCardData[]) => void,
      setError: (message: string) => void,
      signal = controller.signal,
    ) => {
      try {
        const response = await fetch(`${API_BASE_URL}/ads/${path}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal,
        });
        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          throw new Error(errBody?.message ?? 'Oglasi se nisu mogli učitati.');
        }
        const apiAds: unknown[] = await response.json();
        if (signal.aborted) return;
        setAds(apiAds.map(toAdCardData).map((ad: AdCardData) => ({ ...ad, previewImg: resolve_api_ad_img(ad.previewImg) })));
        setError('');
      } catch (err: unknown) {
        if (signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Oglasi se nisu mogli učitati.');
      }
    };

    void Promise.allSettled([
      fetchAds('featured', setFeaturedAds, setFeaturedError),
      fetchAds('recommended', setRecommendedAds, setRecommendedError, recommendationController.signal),
    ]);
    const refreshRecommendations = () => {
      recommendationController.abort();
      recommendationController = new AbortController();
      void fetchAds('recommended', setRecommendedAds, setRecommendedError, recommendationController.signal);
    };
    window.addEventListener('saved-ads-changed', refreshRecommendations);
    return () => {
      controller.abort(); recommendationController.abort();
      window.removeEventListener('saved-ads-changed', refreshRecommendations);
    };
  }, []);

  useEffect(() => {
    sessionCookie.logCookies();
    console.log(localStorage);
  }, []);



  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Restore URL filters after mount to keep initial server/client output consistent.
    Promise.resolve().then(() => {
      setSearch(params.get('search') ?? '');
      setFilters({ brand: params.get('brands') ?? '', model: params.get('models') ?? '', yearMin: params.get('yearMin') ?? '', yearMax: params.get('yearMax') ?? '' });
    });
  }, []);
  const submitFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFilterError('');
    const min = filters.yearMin ? Number(filters.yearMin) : null;
    const max = filters.yearMax ? Number(filters.yearMax) : null;
    if ([min, max].some(value => value !== null && (!Number.isInteger(value) || value < 1886 || value > 2100)) || (min !== null && max !== null && min > max)) {
      setFilterError('Odaberite ispravan raspon godina. Početna godina ne može biti veća od završne.');
      return;
    }
    if (!canNavigate(getCarsUrl())) return;
    window.location.assign(new URL(getCarsUrl(), window.location.origin).toString());
  };

  const canNavigate = (url: string) => {
    return window.dispatchEvent(new CustomEvent('checkout:before-leave', { detail: url, cancelable: true }));
  };


  const getCarsUrl = (preserveCurrentFilters = false) => {
    const params = new URLSearchParams();
    if (preserveCurrentFilters) {
      const currentParams = new URLSearchParams(window.location.search);
      ['brands', 'models', 'yearMin', 'yearMax'].forEach(key => {
        const value = currentParams.get(key);
        if (value) params.set(key, value);
      });
    }
    if (search.trim()) params.set('search', search.trim());
    if (filters.brand.trim()) params.set('brands', filters.brand.trim());
    if (filters.model.trim()) params.set('models', filters.model.trim());
    if (filters.yearMin) params.set('yearMin', filters.yearMin);
    if (filters.yearMax) params.set('yearMax', filters.yearMax);
    const query = params.toString();
    return `/search${query ? `?${query}` : ''}`;
  };

  


  return (
      <>
        <header>
          <Navbar homepage />
        </header>

        <div className="w-full min-w-0 bg-[url(/banner.jpg)] bg-cover bg-center bg-no-repeat px-4 py-5
          sm:px-6 sm:py-8
          lg:px-8 lg:py-10">
          <div className="mx-auto flex w-full min-w-0 max-w-7xl justify-start">
            <section aria-labelledby="filters-title" className="w-full min-w-0 max-w-lg rounded-2xl bg-white p-4 text-gray-900 shadow-2xl
              sm:p-5">
              <div className="flex items-start justify-between gap-3 border-b border-gray-200 pb-2">
                <div>
                  <h2 id="filters-title" className="text-xl font-bold
                    sm:text-2xl">Napredno pretraživanje</h2>
                  <p className="mt-1 text-sm text-gray-600">Suzi pretragu po vozilu i godini proizvodnje.</p>
                </div>
              </div>

              <form onSubmit={submitFilters} className="mt-3 space-y-3">
                <label className="block text-sm font-medium text-gray-700">Pretraži oglase
                  <input type="search" maxLength={200} value={search} onChange={event => setSearch(event.target.value)} placeholder="Naslov ili opis oglasa..." className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900" />
                </label>
                <div className="grid min-w-0 grid-cols-1 gap-3
                  sm:grid-cols-2">
                  <FilterBrands title="Marka" selectedVehicle_type="cars" mode="multi" value={filters.brand.split(',').filter(Boolean)} onChange={brands => setFilters(current => ({ ...current, brand: brands.join(','), model: '' }))} />
                  <FilterModels title="Model" selectedVehicle_type="cars" selectedBrands={filters.brand.split(',').filter(Boolean)} mode="multi" value={filters.model.split(',').filter(Boolean)} onChange={models => setFilters(current => ({ ...current, model: models.join(',') }))} />
                </div>
                <FilterNumeric filterType="year" mode="range" value={{ min: filters.yearMin, max: filters.yearMax }} onChange={years => setFilters(current => ({ ...current, yearMin: years.min, yearMax: years.max }))} />
                {filterError && <p role="alert" className="text-sm text-red-600">{filterError}</p>}
                <div className="flex min-w-0 flex-col-reverse justify-between gap-2 border-t border-gray-200 pt-3
                  sm:flex-row sm:items-center">
                  <button type="button" onClick={() => { setSearch(''); setFilters(emptyFilters); setFilterError(''); }} className="min-h-11 rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Očisti filtre</button>
                  <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-2
                    sm:flex">
                    <button type="button" aria-haspopup="dialog" onClick={() => setAdvancedFilters({...Object.fromEntries(new URLSearchParams(window.location.search)), search, brands: filters.brand, models: filters.model, yearMin: filters.yearMin, yearMax: filters.yearMax})} className="min-h-11 min-w-0 rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Napredno</button>
                    <button type="submit" className="min-h-11 min-w-0 rounded-md bg-[var(--color-navbar)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--color-navbar-hover)]">Pretraži oglase</button>
                  </div>
                </div>
              </form>
            </section>
          </div>
        </div>

        {advancedFilters && <AdvancedSearchModal initialFilters={advancedFilters} onClose={() => setAdvancedFilters(null)} onSearch={params => {
          const url = '/search?' + params.toString();
          if (canNavigate(url)) window.location.assign(new URL(url, window.location.origin).toString());
        }} />}

        <main className="min-w-0 bg-[var(--color-accent-soft)] pb-6 font-semibold
          sm:pb-10
          lg:pb-12">
          <RecentlyViewedAds />

          <section className={sectionClass}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2
              sm:mb-5">
              <h2 className={sectionTitleClass}>
                Kategorije i podkategorije
              </h2>
            </div>

            <div className="grid grid-cols-3 items-start gap-x-3 gap-y-5 py-2
              sm:grid-cols-4 sm:gap-x-4 sm:gap-y-6
              md:grid-cols-5
              xl:grid-cols-10">
              {startCategories.map(({ label, href, icon: Icon, bg }) => (
                  <Link key={label} href={href} className="group flex min-w-0 flex-col items-center gap-2 rounded-lg text-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-navbar)]">
                    <span className={`flex size-12 shrink-0 items-center justify-center rounded-full ${bg} shadow-md transition group-hover:-translate-y-0.5 group-hover:shadow-lg
                      sm:size-16`}>
                      <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <span className="max-w-full break-words text-xs font-semibold text-[var(--color-text)]">
                      {label}
                    </span>
                  </Link>
              ))}
            </div>


          </section>


          <section className={sectionClass}>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <h2 className={sectionTitleClass}>
                Istaknuti oglasi
              </h2>
              <Link
                  href="/search"
                  className={sectionLinkClass}
              >
                <span>Vidi sve</span>
                <ArrowRightIcon className="ml-1 inline h-4 w-4" />
              </Link>
            </div>

            <AdsCarousel
                currentUserId={currentUserId}
                ads={featuredAds}
                errorMessage={featuredError}
            />
          </section>

          <section className={sectionClass}>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <h2 className={sectionTitleClass}>
                Preporučeno
              </h2>
              <Link
                  href="/search"
                  className={sectionLinkClass}
              >
                <span>Vidi sve</span>
                <ArrowRightIcon className="ml-1 inline h-4 w-4" />
              </Link>
            </div>

            <AdsCarousel
                currentUserId={currentUserId}
                ads={recommendedAds}
                errorMessage={recommendedError}
            />
          </section>



          <section className={sectionClass}>
            <div className="min-w-0">
              <h2 className={`${sectionTitleClass} mb-4
                sm:mb-5`}>Popularne marke</h2>

              <div className="grid grid-cols-2 gap-2
                sm:grid-cols-3 sm:gap-3
                md:grid-cols-4
                xl:grid-cols-7">
                {startBrands.map((brand) => (
                    <Link
                        key={brand.name}
                        href={{ pathname: '/search', query: { brands: brand.name } }}
                        className="flex min-w-0 flex-col items-center justify-center gap-2 rounded-lg border border-[var(--border-color)] px-2 py-4 text-center text-xs font-bold text-[var(--color-text)] shadow-sm transition hover:bg-black/5 focus-visible:outline-2
                          sm:px-3 sm:py-5 sm:text-sm"
                    >
                      <Image
                          width={120}
                          height={120}
                          src={brand.logo}
                          alt=""
                          className="h-14 w-full max-w-24 object-contain
                            sm:h-16
                            lg:h-20"
                      />
                      <span className="max-w-full break-words">{brand.name}</span>
                    </Link>
                ))}
              </div>
            </div>
          </section>
        </main>

        <Footer homepage />

      </>
  );
}
