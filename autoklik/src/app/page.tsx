'use client';

import Link from "next/link";
import { AdCard } from "@/components/adCard";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import {ArrowLeftIcon, ArrowRightIcon, CarIcon, CogIcon, MotorbikeIcon, TruckIcon,} from 'lucide-react'
import './globals.css';
import {useEffect, useState} from "react";
import {API_BASE_URL, getSessionToken} from "@/pages/myProfile/account-api";
import type {AdCardData} from "@/types/types";
import {toAdCardData} from '@/shared/ad-data';
import {resolve_api_ad_img} from "@/shared/functions";
import {AdsCarousel} from "@/components/AdsCarousel";
import Image from "next/image";
import {fetchCurrentUser} from '@/app/auth/auth-guards';




export default function Home() {
  const [currentUserId, setCurrentUserId] = useState<number | string | null>();
  useEffect(() => {
    let active = true;
    if (!getSessionToken()) {
      Promise.resolve().then(() => { if (active) setCurrentUserId(null); });
    } else {
      void fetchCurrentUser().then(user => {
        if (active) setCurrentUserId(user.id);
      }).catch(() => undefined);
    }
    return () => { active = false; };
  }, []);
  const [ads, setAds] = useState<AdCardData[]>([]);
  const [errorMessage, setErrorMessage] = useState('')
  const startCategories = ["Automobili", "Motocikli", "Dijelovi", "Električni automobili", "Športski motocikli", "Kamioni", "Oldtimeri", "SUV vozila", "Skuteri", "ATV / Quad"];
  const startBrands = [
    {name: 'Alfa Romeo', logo: '/brands/alfa-romeo-logo-2015.png'},
    {name: 'Audi', logo: '/brands/audi-logo-2016.png'},
    {name: 'BMW', logo: '/brands/bmw-logo-1997.png'},
    {name: 'BYD', logo: '/brands/byd-logo-2022.png'},
    {name: 'Fiat', logo: '/brands/fiat-logo-2006.png'},
    {name: 'Ford', logo: '/brands/ford-logo-2003.png'},
    {name: 'Mazda', logo: '/brands/mazda-logo-2018.v.png'},
    {name: 'Toyota', logo: '/brands/toyota-logo-2005.png'},
    {name: 'Volkswagen', logo: '/brands/volkswagen-logo-2012.png'},
  ];

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const token = typeof window === 'undefined' ? null : window.localStorage.getItem('sessionApiToken');

        const allAdsRes = await fetch(`${API_BASE_URL}/ads/featured`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!allAdsRes.ok) {
          const errBody = await allAdsRes.json().catch(() => ({}));
          throw new Error(errBody?.message ?? 'Failed to load saves.');
        }

        const apiAds: unknown[] = await allAdsRes.json();
        setAds(apiAds.map(toAdCardData).map((ad: AdCardData) => ({ ...ad, previewImg: resolve_api_ad_img(ad.previewImg) })));
        setErrorMessage('');

      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : 'Failed to load alls.');
      }
    };

    fetchAll();
  }, []);





  return (
      <>
        <header>
          <Navbar />
        </header>

        <main className="bg-[var(--color-accent-soft)] font-semibold">
          <section className="mx-auto max-w-7xl px-4 pt-10">
            <div className="flex items-end justify-between gap-4">
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-[var(--color-navbar)]">
                Automobili - Istaknuti oglasi
              </p>
              <Link
                  href="/search"
                  className="text-sm font-bold text-[var(--color-navbar)] hover:text-[var(--color-text)]"
              >
                Vidi sve
              </Link>
            </div>

            <AdsCarousel
                currentUserId={currentUserId}
                ads={ads}
                errorMessage={errorMessage}
            />
          </section>


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
                        width={40}
                        height={40}
                        src={brand.logo}
                        alt=""
                        className="h-10 w-10 object-contain"
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
