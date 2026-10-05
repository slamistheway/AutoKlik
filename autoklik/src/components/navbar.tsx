'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, type FormEvent } from 'react';
import { clearSessionToken, fetchCurrentUser } from '@/app/auth/auth-guards';
import type { CurrentUser } from '@/types/types';
import {
  BellIcon,
  HeartIcon,
  MenuIcon,
  MessageCircleIcon,
  PlusIcon,
  SearchIcon,
  SlidersHorizontal,
  UserIcon,
  X
} from 'lucide-react';
import {MessageNotifications} from "@/components/message-notifications";

const mobileLinkClass = 'block rounded-md px-3 py-2 text-base font-medium text-red-50 hover:bg-red-600 hover:text-white';

type SearchFilters = {
  brand: string;
  model: string;
  yearMin: string;
  yearMax: string;
};

const emptyFilters: SearchFilters = { brand: '', model: '', yearMin: '', yearMax: '' };

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<SearchFilters>(emptyFilters);

  useEffect(() => {
    let active = true;
    fetchCurrentUser()
      .then(user => { if (active) setCurrentUser(user); })
      .catch(() => { if (active) setCurrentUser(null); });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!isFiltersOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsFiltersOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isFiltersOpen]);

  const closeMenus = () => {
    setIsMenuOpen(false);
    setIsProfileDropdownOpen(false);
  };

  const openFilters = () => {
    const params = new URLSearchParams(window.location.search);
    setSearch(params.get('search') ?? '');
    setFilters({
      brand: params.get('brands') ?? '',
      model: params.get('models') ?? '',
      yearMin: params.get('yearMin') ?? '',
      yearMax: params.get('yearMax') ?? '',
    });
    setIsFiltersOpen(true);
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

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    window.location.assign(new URL(getCarsUrl(true), window.location.origin).toString());
  };

  const submitFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsFiltersOpen(false);
    window.location.assign(new URL(getCarsUrl(), window.location.origin).toString());
  };

  const onLogoutClick = () => {
    clearSessionToken();
    setCurrentUser(null);
    closeMenus();
    window.location.assign(new URL('/', window.location.origin).toString());
  };

  return (
    <>
      <nav className="drop-shadow-xl">
        <div className="bg-[var(--color-navbar)] px-4">
          <div className="mx-auto flex h-13 max-w-7xl items-center justify-between gap-6">
            <Link href="/" onClick={closeMenus} className="text-2xl font-bold text-white">AutoKlik</Link>

            <div className="hidden items-center space-x-3 md:flex">
              <Link href="/mySavedAds" className="flex items-center gap-1 text-red-50 hover:text-red-200"><HeartIcon className="h-5 w-5" /><span>Spremljeno</span></Link>
              <Link href="/myMessages" className="flex items-center gap-1 text-red-50 hover:text-red-200"><MessageCircleIcon className="h-5 w-5" /><span>Poruke</span></Link>
              {currentUser &&
                  <MessageNotifications/>
              }

              {currentUser ? (
                <div className="relative">
                  <button type="button" aria-expanded={isProfileDropdownOpen} onClick={() => setIsProfileDropdownOpen(open => !open)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-50 hover:text-red-200">
                    <Image src={currentUser.pfp ? `http://localhost:3001/${currentUser.pfp}` : 'http://localhost:3001/default-pfp.jpg'} alt="Profil" width={24} height={24} unoptimized className="h-6 w-6 rounded-full object-cover" />
                    <span>{currentUser.username}</span>
                    <span>{isProfileDropdownOpen ? '▲' : '▼'}</span>
                  </button>
                  {isProfileDropdownOpen && (
                    <div className="absolute right-0 z-50 mt-2 w-40 rounded-md border border-red-700 bg-[var(--color-footer)] shadow-lg">
                      <Link href="/myProfile" onClick={closeMenus} className="block px-4 py-2 text-sm text-red-50 hover:bg-red-600">Moj profil</Link>
                      <Link href="/mySettings" onClick={closeMenus} className="block px-4 py-2 text-sm text-red-50 hover:bg-red-600">Postavke</Link>
                      <button type="button" onClick={onLogoutClick} className="block w-full px-4 py-2 text-left text-sm text-red-50 hover:bg-red-600">Odjava</button>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/login" className="flex items-center gap-1 text-red-50 hover:text-red-200"><UserIcon className="h-5 w-5" /><span>Prijava</span></Link>
              )}
            </div>

            <button type="button" aria-label={isMenuOpen ? 'Zatvori izbornik' : 'Otvori izbornik'} aria-expanded={isMenuOpen} onClick={() => setIsMenuOpen(open => !open)} className="rounded-md p-2 text-red-50 hover:text-red-200 md:hidden">
              <MenuIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="bg-amber-800 px-4">
          <div className="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-4 py-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <button type="button" onClick={openFilters} aria-haspopup="dialog" className="flex h-10 shrink-0 items-center gap-2 rounded-md border border-white/60 px-3 text-sm font-semibold text-white hover:bg-white/10">
                <SlidersHorizontal className="h-4 w-4" /><span>Filteri</span>
              </button>

              <form onSubmit={submitSearch} className="flex min-w-0 flex-1 items-center md:max-w-3xl">
                <input type="search" aria-label="Pretraži oglase" placeholder="Pretraži oglase..." value={search} onChange={event => setSearch(event.currentTarget.value)} className="h-10 min-w-0 flex-1 rounded-l-md border border-gray-300 bg-white px-3 text-gray-900 outline-none focus:ring-2 focus:ring-[var(--color-navbar)]" />
                <button type="submit" aria-label="Pretraži" className="flex h-10 items-center gap-2 rounded-r-md bg-[var(--color-navbar)] px-4 font-semibold text-white hover:bg-[var(--color-navbar-hover)]">
                  <SearchIcon className="h-4 w-4" /><span className="hidden sm:inline">Pretraži</span>
                </button>
              </form>

              <button onClick={() => localStorage.clear()} className="ml-2 rounded-md bg-red-600 px-3 py-1 text-sm font-semibold text-white hover:bg-red-700">
                Delete localStorage
              </button>

            </div>

            <Link href="/checkout/vehicle-category" className="flex rounded bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700">
              <PlusIcon />
              <span>Objavi oglas</span>
            </Link>
          </div>
        </div>

        {isMenuOpen && (
          <div className="rounded-b-xl bg-[var(--color-footer)] md:hidden">
            <div className="space-y-1 px-2 pb-3 pt-2 sm:px-3">
              <Link href="/autoklik/src/pages/search" onClick={closeMenus} className={mobileLinkClass}>Oglasi</Link>
              {currentUser ? (
                <>
                  <p className="px-3 py-2 text-sm font-semibold text-red-50">{currentUser.username}</p>
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

      {isFiltersOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]" onMouseDown={event => { if (event.target === event.currentTarget) setIsFiltersOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="filters-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 text-gray-900 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 pb-4">
              <div>
                <h2 id="filters-title" className="text-2xl font-bold">Filtriraj oglase</h2>
                <p className="mt-1 text-sm text-gray-600">Suzi pretragu po vozilu i godini proizvodnje.</p>
              </div>
              <button type="button" aria-label="Zatvori filtre" onClick={() => setIsFiltersOpen(false)} className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={submitFilters} className="mt-5 space-y-5">
              <label className="block text-sm font-medium text-gray-700">
                Marka
                <input type="text" value={filters.brand} onChange={event => setFilters(current => ({ ...current, brand: event.currentTarget.value }))} placeholder="npr. Volkswagen" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-[var(--color-navbar)] focus:ring-2 focus:ring-[var(--color-navbar)]/20" />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Model
                <input type="text" value={filters.model} onChange={event => setFilters(current => ({ ...current, model: event.currentTarget.value }))} placeholder="npr. Golf" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-[var(--color-navbar)] focus:ring-2 focus:ring-[var(--color-navbar)]/20" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-gray-700">
                  Godina od
                  <input type="number" min="1900" max="2100" value={filters.yearMin} onChange={event => setFilters(current => ({ ...current, yearMin: event.currentTarget.value }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-[var(--color-navbar)] focus:ring-2 focus:ring-[var(--color-navbar)]/20" />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  Godina do
                  <input type="number" min="1900" max="2100" value={filters.yearMax} onChange={event => setFilters(current => ({ ...current, yearMax: event.currentTarget.value }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-[var(--color-navbar)] focus:ring-2 focus:ring-[var(--color-navbar)]/20" />
                </label>
              </div>
              <div className="flex flex-col-reverse justify-between gap-3 border-t border-gray-200 pt-4 sm:flex-row">
                <button type="button" onClick={() => { setSearch(''); setFilters(emptyFilters); }} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Očisti filtre</button>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setIsFiltersOpen(false)} className="rounded-md px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100">Odustani</button>
                  <button type="submit" className="rounded-md bg-[var(--color-navbar)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--color-navbar-hover)]">Prikaži oglase</button>
                </div>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
