'use client';

import Link from "next/link";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import {ArrowRightIcon} from 'lucide-react'
import './globals.css';
import {useEffect, useState} from "react";
import { API_BASE_URL } from "@/pages/myProfile/account-api";
import {sessionCookie} from '@/components/cookies/cookies';
import type {AdCardData} from "@/types/types";
import {toAdCardData} from '@/shared/ad-data';
import {resolve_api_ad_img} from "@/shared/functions";
import {AdsCarousel} from "@/components/AdsCarousel";
import Image from "next/image";
import {fetchCurrentUser} from '@/app/auth/auth-guards';




export default function Home() {
  const [currentUserId, setCurrentUserId] = useState<number | string | null>();
  const [featuredAds, setFeaturedAds] = useState<AdCardData[]>([]);
  const [recommendedAds, setRecommendedAds] = useState<AdCardData[]>([]);


  const [featuredError, setFeaturedError] = useState('');
  const [recommendedError, setRecommendedError] = useState('');
  const startCategories = ["Automobili", "Motocikli", "Dijelovi", "Električni automobili", "Športski motocikli", "Kamioni", "Oldtimeri", "SUV vozila", "Skuteri", "ATV / Quad"];
  const startBrands = [
    {name: 'Alfa Romeo', logo: '/brands/alfa-romeo-logo-2015.png'},
    {name: 'Audi', logo: '/brands/audi-logo-2016.png'},
    {name: 'BMW', logo: '/brands/bmw-logo-1997.png'},
    {name: 'BYD', logo: '/brands/byd-logo-2022.png'},
    {name: 'Dacia', logo: '/brands/dacia-logo-2015.png'},
    {name: 'Fiat', logo: '/brands/fiat-logo-2006.png'},
    {name: 'Ford', logo: '/brands/ford-logo-2003.png'},
    {name: 'Mazda', logo: '/brands/mazda-logo-2018.v.png'},
    {name: 'Renault', logo: '/brands/renault-logo-2015.png'},
    {name: 'Škoda', logo: '/brands/skoda-logo-1999.png'},
    {name: 'Toyota', logo: '/brands/toyota-logo-2005.png'},
    {name: 'Volkswagen', logo: '/brands/volkswagen-logo-2012.png'},
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
    const token = sessionCookie.getSessionToken();
    const fetchAds = async (
      path: string,
      setAds: (ads: AdCardData[]) => void,
      setError: (message: string) => void,
    ) => {
      try {
        const response = await fetch(`${API_BASE_URL}/ads/${path}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: controller.signal,
        });
        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          throw new Error(errBody?.message ?? 'Oglasi se nisu mogli učitati.');
        }
        const apiAds: unknown[] = await response.json();
        if (controller.signal.aborted) return;
        setAds(apiAds.map(toAdCardData).map((ad: AdCardData) => ({ ...ad, previewImg: resolve_api_ad_img(ad.previewImg) })));
        setError('');
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Oglasi se nisu mogli učitati.');
      }
    };

    void Promise.allSettled([
      fetchAds('featured', setFeaturedAds, setFeaturedError),
      fetchAds('all', setRecommendedAds, setRecommendedError),
    ]);
    return () => controller.abort();
  }, []);



  useEffect(() => {
    sessionCookie.logCookies();
    console.log(localStorage);
  }, []);





  return (
      <>
        <header>
          <Navbar />
        </header>

        <main className="bg-[var(--color-accent-soft)] font-semibold">
          <section className="mx-auto max-w-7xl px-4 pt-10">
            <div className="mb-5 flex items-end justify-between gap-4">
              <h2 className="text-xl font-bold text-[var(--color-text)]">
                Kategorije i podkategorije
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {startCategories.map((category) => (
                  <Link
                      key={category}
                      href="/search"
                      className="group flex min-h-16 items-center justify-between gap-3 rounded-xl border border-[var(--border-color)] bg-white px-4 py-3 text-sm font-semibold text-[var(--color-text)] transition hover:border-[var(--color-navbar)] hover:bg-[var(--color-surface-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-navbar)]"
                  >
                    <span>{category}</span>
                    <ArrowRightIcon className="h-4 w-4 shrink-0 text-[var(--color-navbar)] transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </Link>
              ))}
            </div>
          </section>


          <section className="mx-auto max-w-7xl px-4 pt-10">
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-xl font-bold text-[var(--color-navbar)] sm:text-2xl">
                Automobili - Istaknuti oglasi
              </h2>
              <Link
                  href="/search"
                  className="shrink-0 rounded-lg px-3 py-2 text-base font-bold text-[var(--color-navbar)] transition hover:bg-black/5 hover:text-[var(--color-text)] sm:text-lg"
              >
                Vidi sve
              </Link>
            </div>

            <AdsCarousel
                currentUserId={currentUserId}
                ads={featuredAds}
                errorMessage={featuredError}
            />
          </section>

          <section className="mx-auto max-w-7xl px-4 pt-10">
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-xl font-bold text-[var(--color-navbar)] sm:text-2xl">
                Automobili - Preporučeno
              </h2>
              <Link
                  href="/search"
                  className="shrink-0 rounded-lg px-3 py-2 text-base font-bold text-[var(--color-navbar)] transition hover:bg-black/5 hover:text-[var(--color-text)] sm:text-lg"
              >
                Vidi sve
              </Link>
            </div>

            <AdsCarousel
                currentUserId={currentUserId}
                ads={recommendedAds}
                errorMessage={recommendedError}
            />
          </section>



          <section className="mx-auto max-w-7xl px-4 pt-10">
            <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] p-6">
              <h2 className="mb-5 text-xl font-bold text-[var(--color-text)]">Popularne marke automobila</h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                {startBrands.map((brand) => (
                    <Link
                        key={brand.name}
                        href="/search"
                        className="flex min-w-0 flex-col items-center justify-center gap-2 border-b border-r border-[var(--border-color)] px-3 py-6 text-center text-sm font-bold text-[var(--color-text)] transition hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-[var(--color-navbar)] [&:nth-child(2n)]:border-r-0 sm:[&:nth-child(2n)]:border-r sm:[&:nth-child(3n)]:border-r-0 lg:[&:nth-child(3n)]:border-r lg:[&:nth-child(6n)]:border-r-0 [&:nth-child(n+9)]:border-b-0 sm:[&:nth-child(n+7)]:border-b-0"
                    >
                      <Image
                          width={120}
                          height={120}
                          src={brand.logo}
                          alt=""
                          className="w-auto h-auto object-contain"
                      />
                      <span>{brand.name}</span>
                    </Link>
                ))}
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </>
  );
}
