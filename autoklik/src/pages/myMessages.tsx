'use client';

import Link from 'next/link';
import { useRouter } from 'next/router';
import type { ReactNode } from 'react';
import { Footer } from '@/components/footer';
import { Navbar } from '@/components/navbar';

const navigation = [
  { href: '/myProfile', label: 'Moj profil' },
  { href: '/myMessages', label: 'Poruke' },
  { href: '/mySavedAds', label: 'Spremljeni oglasi' },
  { href: '/mySettings', label: 'Postavke' },
];



export function MyMessages() {
    const router = useRouter();

    return (
        <>
            <header>
                <Navbar />
            </header>

            <main className="min-h-screen bg-gray-50 px-4 py-10"><div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row">
                <aside className="h-fit w-full shrink-0 rounded-lg border border-gray-200 bg-white p-4 shadow-md md:w-56">
                    <nav aria-label="Korisnički izbornik" className="flex flex-col gap-2">
                    {navigation.map(item =>
                        <a key={item.href}
                              href={item.href}
                              aria-current={router.pathname === item.href ? 'page' : undefined}
                              className={`rounded px-3 py-2 text-sm font-medium transition ${router.pathname === item.href ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-blue-100 hover:text-blue-700'}`}
                        >
                            {item.label}
                        </a>)}
                    </nav>

                </aside>
                <section className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white p-5 shadow-md sm:p-6">
                    <h1 className="text-2xl font-bold text-gray-900">Poruke</h1>
                    <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">
                        Trenutno nema poruka.
                    </div>
                </section>
                </div>
            </main>

            <Footer />
        </>


  );
}

export default MyMessages;
