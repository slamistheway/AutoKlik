'use client';

import Link from "next/link";
import { AdCard, type AdCardData } from "@/components/adCard";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import {CarIcon, CogIcon, MotorbikeIcon, TruckIcon,} from 'lucide-react'
import './globals.css';
import {useEffect, useState} from "react";
import {getSessionToken} from "@/pages/myProfile/account-api";




export default function Home() {
  useEffect(() => {
      console.log(localStorage)
  }, []);



  return (
      <>
        <header>
          <Navbar />
        </header>

        <main className="bg-[var(--color-accent-soft)] py-10 font-semibold">
          <section className="mx-auto max-w-7xl px-4">

            <div className="grid grid-cols-2 overflow-hidden rounded-3xl border border-[var(--border-color)] bg-white shadow-xl">
              <div className="bg-gradient-to-br from-[var(--color-text)] via-[var(--color-navbar-hover)] to-[var(--color-navbar)] p-8 text-white lg:p-12">
                <p className="text-xs font-bold uppercase tracking-[0.4em] text-[var(--color-accent-soft)]">
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
                      href="/pretrazi"
                      className="rounded-full bg-[var(--color-navbar)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-navbar-hover)]"
                  >
                    Trazi
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-[var(--color-surface-muted)] p-6 lg:p-8">
                <Link
                    href="/cars"
                    className="group rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <CarIcon className="mx-auto h-6 w-6 text-gray-500" />
                  <h2 className="text-lg font-bold text-gray-900">Automobili</h2>
                </Link>

                <Link
                    href="/cars"
                    className="group rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <MotorbikeIcon className="mx-auto h-6 w-6 text-gray-500" />
                  <h2 className="text-lg font-bold text-gray-900">Motori</h2>
                </Link>

                <Link
                    href="/cars"
                    className="group rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <TruckIcon className="mx-auto h-6 w-6 text-gray-500" />
                  <h2 className="text-lg font-bold text-gray-900">Kombiji</h2>
                </Link>

                <Link
                    href="/cars"
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
                  href="/cars"
                  className="text-sm font-bold text-[var(--color-navbar)] hover:text-[var(--color-text)]"
              >
                Vidi sve
              </Link>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {/*{featuredAds.map((ad) => (
                  <AdCard
                      key={ad.id}
                      ad={ad}
                      href={`/ad/${ad.id}`}
                  />
              ))}*/}
            </div>
          </section>
        </main>

        <Footer />
      </>
  );
}
