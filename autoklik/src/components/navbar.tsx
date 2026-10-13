'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, type FormEvent } from 'react';
import { logout, fetchCurrentUser } from '@/app/auth/auth-guards';
import type { CurrentUser } from '@/types/types';
import {
  HeartIcon,
  MenuIcon,
  MessageCircleIcon,
  PlusIcon,
  SearchIcon,
  UserIcon
} from 'lucide-react';
import {MessageNotifications} from "@/components/message-notifications";

const mobileLinkClass = 'block rounded-md px-3 py-2 text-base font-medium text-slate-700 transition-colors hover:bg-rose-50 hover:text-rose-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600';



export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    fetchCurrentUser()
      .then(user => { if (active) setCurrentUser(user); })
      .catch(() => { if (active) setCurrentUser(null); });

    return () => { active = false; };
  }, []);

  const closeMenus = () => {
    setIsMenuOpen(false);
    setIsProfileDropdownOpen(false);
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
    const query = params.toString();
    return `/search${query ? `?${query}` : ''}`;
  };

  const canNavigate = (url: string) => {
    return window.dispatchEvent(new CustomEvent('checkout:before-leave', { detail: url, cancelable: true }));
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canNavigate(getCarsUrl(true))) return;
    window.location.assign(new URL(getCarsUrl(true), window.location.origin).toString());
  };


  const onLogoutClick = async () => {
    if (!canNavigate('/')) return;
    try {
      await logout();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Odjava nije uspjela.');
      return;
    }
    setCurrentUser(null);
    closeMenus();
    window.location.assign(new URL('/', window.location.origin).toString());
  };

  return (
    <>
      <nav className="relative z-50 shadow-[0_4px_18px_rgba(15,23,42,0.10)]">
        <div className="bg-[#a4473b] px-4">
          <div className="mx-auto flex h-13 max-w-7xl items-center justify-between gap-6">
            <Link href="/" onClick={closeMenus} className="text-2xl font-bold text-white">AutoKlik</Link>

            <div className="hidden items-center space-x-3 md:flex">
              <Link href="/mySavedAds" className="flex items-center gap-1 text-rose-100 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-200"><HeartIcon className="h-5 w-5" /><span>Spremljeno</span></Link>
              <Link href="/myMessages" className="flex items-center gap-1 text-rose-100 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-200"><MessageCircleIcon className="h-5 w-5" /><span>Poruke</span></Link>
              {currentUser &&
                  <MessageNotifications/>
              }

              {currentUser ? (
                <div className="relative">
                  <button type="button" aria-expanded={isProfileDropdownOpen} onClick={() => setIsProfileDropdownOpen(open => !open)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-white/10 text-rose-100 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-200">
                    <Image src={currentUser.pfp ? `http://localhost:3001/${currentUser.pfp}` : 'http://localhost:3001/default-pfp.jpg'} alt="Profil" width={24} height={24} unoptimized className="h-6 w-6 rounded-full object-cover ring-2 ring-white/20" />
                    <span>{currentUser.username}</span>
                    <span>{isProfileDropdownOpen ? '▲' : '▼'}</span>
                  </button>
                  {isProfileDropdownOpen && (
                    <div className="absolute right-0 z-50 mt-2 w-40 rounded-md border border-slate-200 bg-white shadow-xl">
                      <Link href="/myProfile" onClick={closeMenus} className="block px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-rose-50 hover:text-rose-900 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-rose-600">Moj profil</Link>
                      <Link href="/mySettings" onClick={closeMenus} className="block px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-rose-50 hover:text-rose-900 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-rose-600">Postavke</Link>
                      <button type="button" onClick={onLogoutClick} className="block w-full px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-rose-50 hover:text-rose-900 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-rose-600">Odjava</button>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/login" className="flex items-center gap-1 text-rose-100 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-200"><UserIcon className="h-5 w-5" /><span>Prijava</span></Link>
              )}
            </div>

            <button type="button" aria-label={isMenuOpen ? 'Zatvori izbornik' : 'Otvori izbornik'} aria-expanded={isMenuOpen} onClick={() => setIsMenuOpen(open => !open)} className="rounded-md p-2 text-rose-100 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-200 md:hidden">
              <MenuIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="bg-[#a3b18a] px-4 shadow-[inset_0_1px_0_#879875]">
          <div className="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-4 py-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">

              <form onSubmit={submitSearch} className="flex min-w-0 flex-1 items-center md:max-w-3xl">
                <input type="search" maxLength={200} aria-label="Pretraži oglase" placeholder="Pretraži oglase..." value={search} onChange={event => setSearch(event.currentTarget.value)} className="h-10 min-w-0 flex-1 rounded-l-md border border-slate-300 bg-white px-3 text-slate-900 placeholder:text-slate-400 outline-none transition-shadow focus:border-rose-700 focus:ring-2 focus:ring-rose-700/20" />
                <button type="submit" aria-label="Pretraži" className="flex h-10 items-center gap-2 rounded-r-md bg-[#a4473b] px-4 font-semibold text-white hover:bg-[#87382e]">
                  <SearchIcon className="h-4 w-4" /><span className="hidden sm:inline">Pretraži</span>
                </button>
              </form>

              <button onClick={() => localStorage.clear()} className="ml-2 rounded-md bg-white px-3 py-1 text-sm font-semibold text-slate-600 ring-1 ring-inset ring-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700">
                Delete localStorage
              </button>

            </div>

            <Link href="/checkout/vehicle-category" className="flex rounded bg-[#a4473b] px-4 py-2 font-bold text-white shadow-sm transition-colors hover:bg-[#87382e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#87382e]">
              <PlusIcon />
              <span>Objavi oglas</span>
            </Link>
          </div>
        </div>

        {isMenuOpen && (
          <div className="rounded-b-xl bg-white shadow-[inset_0_1px_0_#e2e8f0] md:hidden">
            <div className="space-y-1 px-2 pb-3 pt-2 sm:px-3">
              <Link href="/autoklik/src/pages/search" onClick={closeMenus} className={mobileLinkClass}>Oglasi</Link>
              {currentUser ? (
                <>
                  <p className="px-3 py-2 text-sm font-semibold text-slate-900">{currentUser.username}</p>
                  <Link href="/myProfile" onClick={closeMenus} className={mobileLinkClass}>Moj profil</Link>
                  <Link href="/mySavedAds" onClick={closeMenus} className={mobileLinkClass}>Spremljeno</Link>
                  <Link href="/myMessages" onClick={closeMenus} className={mobileLinkClass}>Poruke</Link>
                  <Link href="/mySettings" onClick={closeMenus} className={mobileLinkClass}>Postavke</Link>
                  <button type="button" onClick={onLogoutClick} className={`${mobileLinkClass} w-full text-left`}>Odjava</button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={closeMenus} className={mobileLinkClass}>Prijava</Link>
                  <Link href="/register" onClick={closeMenus} className={mobileLinkClass}>Registracija</Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

    </>
  );
}
