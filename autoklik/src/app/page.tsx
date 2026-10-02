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




export default function Home() {
  const [ads, setAds] = useState<AdCardData[]>([]);
  const [errorMessage, setErrorMessage] = useState('')
  const startCategories = ["Automobili", "Motocikli", "Dijelovi", "Električni automobili", "Športski motocikli", "Kamioni", "Oldtimeri", "SUV vozila", "Skuteri", "ATV / Quad"];


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

        <main className="bg-[var(--color-accent-soft)] py-10 font-semibold">
          <section className="mx-auto max-w-7xl px-4">

            <div className="grid grid-cols-2 overflow-hidden rounded-3xl border border-[var(--border-color)] bg-white shadow-xl">
              <div className="bg-linear-to-br from-(--color-text) via-(--color-navbar-hover) to-[var(--color-navbar)] p-8 text-white lg:p-12">
                <p className="text-xs font-bold uppercase tracking-[0.4em] text-(--color-accent-soft)">
                  AutoKlik
                </p>

                <h1 className="mt-4 text-4xl font-black leading-tight lg:text-5xl">
                  Pronadi vozilo po svojim potrebama.
                </h1>

                <div className="mt-8 flex flex-wrap gap-3">
                  <input
                      type="text"
                      placeholder="Sto trazis?"
                      className="flex-1 rounded-full border border-gray-300 px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navbar)]"
                  />

                  <Link
                      href="/search"
                      className="rounded-full bg-[var(--color-navbar)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-navbar-hover)]"
                  >
                    Trazi
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-[var(--color-surface-muted)] p-6 lg:p-8">
                <Link
                    href="/search"
                    className="group rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <CarIcon className="mx-auto h-6 w-6 text-gray-500" />
                  <h2 className="text-lg font-bold text-gray-900">Automobili</h2>
                </Link>

                <Link
                    href="/search"
                    className="group rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <MotorbikeIcon className="mx-auto h-6 w-6 text-gray-500" />
                  <h2 className="text-lg font-bold text-gray-900">Motori</h2>
                </Link>

                <Link
                    href="/search"
                    className="group rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <TruckIcon className="mx-auto h-6 w-6 text-gray-500" />
                  <h2 className="text-lg font-bold text-gray-900">Kombiji</h2>
                </Link>

                <Link
                    href="/search"
                    className="group rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <CogIcon className="mx-auto h-6 w-6 text-gray-500" />
                  <h2 className="text-lg font-bold text-gray-900">Dijelovi i oprema</h2>
                </Link>
              </div>
            </div>

          </section>

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
                ads={ads}
                errorMessage={errorMessage}
            />
          </section>


          <section className="mx-auto max-w-7xl px-4 pt-10">
            <div className="flex items-end justify-between gap-4">
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-[var(--color-navbar)]">
                Kategorije i podkategorije
              </p>
            </div>

            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${startCategories.length}, minmax(0, 1fr))` }}>
              {startCategories.map((category) => (
                <Link
                  key={category}
                  href="/search"
                  className="px-4 py-2 rounded-md bg-[var(--color-navbar)] text-white hover:bg-[var(--color-navbar-hover)] disabled:opacity-50"
                >
                  {category}
                </Link>
              ))}
            </div>
          </section>



        </main>

        <Footer />
      </>
  );
}
