'use client';

import { useRouter as useAccountRouter } from 'next/router';
import type { ReactNode } from 'react';
import { Footer } from '@/components/footer';
import { Navbar } from '@/components/navbar';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { authGuard, fetchCurrentUser } from '@/app/auth/auth-guards';
import type { CurrentUser } from '@/types/types';

import { API_BASE_URL, getResponseMessage, getSessionToken } from './myProfile/account-api';
import { usePathname } from 'next/navigation'


type ProfileAd = { id: number };
type SavedAd = { ad_id: number };

const profileNavigation = [
  { href: '/myProfile', label: 'Moj profil' },
  { href: '/myMessages', label: 'Poruke' },
  { href: '/mySavedAds', label: 'Spremljeni oglasi' },
  { href: '/mySettings', label: 'Postavke' },
];


export default function MyProfilePage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [error, setError] = useState('');
  const [adsCount, setAdsCount] = useState<number | null>(null);
  const [savedAdsCount, setSavedAdsCount] = useState<number | null>(null);
  const [statsError, setStatsError] = useState('');
  const pathname = usePathname()

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      let currentUser: CurrentUser;
      try {
        currentUser = await fetchCurrentUser();
        if (active) setUser(currentUser);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Nije moguće učitati korisnički profil.');
        return;
      }

      try {
        const token = getSessionToken();
        if (!token) throw new Error('Sesija je istekla. Prijavite se ponovo.');
        const headers = { Authorization: `Bearer ${token}` };
        const [adsResponse, savedResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/ads/me`, { headers }),
          fetch(`${API_BASE_URL}/ads/me/saved`, { headers }),
        ]);
        if (!adsResponse.ok) throw new Error(await getResponseMessage(adsResponse, 'Nije moguće učitati vaše oglase.'));
        if (!savedResponse.ok) throw new Error(await getResponseMessage(savedResponse, 'Nije moguće učitati spremljene oglase.'));
        const [ads, savedAds] = await Promise.all([
          adsResponse.json() as Promise<ProfileAd[]>,
          savedResponse.json() as Promise<SavedAd[]>,
        ]);
        if (active) {
          setAdsCount(Array.isArray(ads) ? ads.length : 0);
          setSavedAdsCount(Array.isArray(savedAds) ? savedAds.length : 0);
        }
      } catch (loadError) {
        if (active) setStatsError(loadError instanceof Error ? loadError.message : 'Broj oglasa i spremljenih oglasa trenutno nije dostupan.');
      }
    };
    void loadProfile();
    return () => { active = false; };
  }, []);

  return (
      <>
        <header>
          <Navbar />
        </header>

        <main className="min-h-screen bg-gray-50 px-4 py-10"><div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row">
          <aside className="h-fit w-full shrink-0 rounded-lg border border-gray-200 bg-white p-4 shadow-md md:w-56">
            <nav aria-label="Korisnički izbornik" className="flex flex-col gap-2">
            {profileNavigation.map(item => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined} className={`rounded px-3 py-2 text-sm font-medium transition ${pathname === item.href ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-blue-100 hover:text-blue-700'}`}>{item.label}</Link>)}
          </nav>
          </aside>
          <section className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white p-5 shadow-md sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900">Moj profil</h1>
            {error && <p role="alert" className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            {user ? (
                <div className="mt-6 space-y-6">
                  <div className="flex items-center gap-4">
                    <Image src={`${API_BASE_URL}/${user.pfp || 'default-pfp.jpg'}`} alt="Profilna slika" width={80} height={80} unoptimized className="h-20 w-20 rounded-full object-cover" />
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">{user.firstName || user.lastName ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : user.username}</h2>
                      <p className="mt-1 text-sm text-gray-600">{user.email}</p>
                    </div>
                  </div>
                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-lg border border-gray-200 p-4"><dt className="text-sm text-gray-600">Moji oglasi</dt><dd className="mt-1 text-2xl font-bold text-gray-900">{adsCount ?? '—'}</dd></div>
                    <div className="rounded-lg border border-gray-200 p-4"><dt className="text-sm text-gray-600">Spremljeni oglasi</dt><dd className="mt-1 text-2xl font-bold text-gray-900">{savedAdsCount ?? '—'}</dd></div>
                    <div className="rounded-lg border border-gray-200 p-4"><dt className="text-sm text-gray-600">Status računa</dt><dd className="mt-1 text-2xl font-bold text-green-700">Aktivan</dd></div>
                  </dl>
                  {statsError && <p role="status" className="text-sm text-amber-700">{statsError}</p>}
                  <div className="flex flex-wrap gap-3">
                    <Link href="/myProfile/mySettings" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Uredi profil</Link>
                    <Link href="/mySavedAds" className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Spremljeni oglasi</Link>
                  </div>
                </div>
            ) : !error ? <p className="mt-6 text-sm text-gray-600">Učitavanje profila...</p> : null}

          </section>
        </div>
        </main>

        <Footer />
      </>
  );
}

export const MyProfile = authGuard(MyProfilePage);
