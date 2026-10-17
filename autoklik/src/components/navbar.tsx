'use client';

import Link from 'next/link';
import { CompareLink } from '@/components/compare-controls';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { logout, fetchCurrentUser } from '@/app/auth/auth-guards';
import type { CurrentUser } from '@/types/types';
import {
  ChevronDownIcon,
  HeartIcon,
  MenuIcon,
  MessageCircleIcon,
  PlusIcon,
  SearchIcon,
  UserIcon,
  XIcon
} from 'lucide-react';
import { MessageNotifications } from '@/components/message-notifications';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// Debug button is visible everywhere except production builds.
// Set to `true` if you want it always visible.
const SHOW_DEBUG_BUTTON = process.env.NODE_ENV !== 'production';

const FILTER_KEYS = ['brands', 'models', 'yearMin', 'yearMax'] as const;

// ---- Shared class strings (full strings so Tailwind can detect them) ----
const focusLight = 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-200';

const desktopLinkClass = `flex items-center gap-1 text-rose-100 transition-colors hover:text-white ${focusLight}`;

const mobileLinkClass =
    'block rounded-md px-3 py-2 text-base font-medium text-slate-700 transition-colors hover:bg-rose-50 hover:text-rose-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600';

const dropdownItemClass =
    'block w-full px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-rose-50 hover:text-rose-900 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-rose-600';

const ctaClass =
    'flex shrink-0 items-center gap-1 rounded bg-white px-4 py-2 font-bold text-[#a4473b] shadow-sm ring-1 ring-inset ring-[#a4473b]/20 transition-colors hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#87382e]';

type LeaveEvent = CustomEvent<string> & { resume?: () => void };

export function Navbar({homepage = false}: {homepage?: boolean} = {}) {
  const router = useRouter();
  const pathname = usePathname();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [search, setSearch] = useState('');
  const navLinkClass = desktopLinkClass;

  const profileRef = useRef<HTMLDivElement>(null);

  // Load the current user on mount and refetch on route change,
  // so the navbar updates after login/logout without a full reload.
  useEffect(() => {
    let active = true;
    fetchCurrentUser()
        .then(user => { if (active) setCurrentUser(user); })
        .catch(() => { if (active) setCurrentUser(null); });

    return () => { active = false; };
  }, [pathname]);

  // Close menus and sync the search box with the URL whenever the route changes.
  useEffect(() => {
    setIsMenuOpen(false);
    setIsProfileDropdownOpen(false);
    setSearch(new URLSearchParams(window.location.search).get('search') ?? '');
  }, [pathname]);

  // Close the profile dropdown on outside click, and everything on Escape.
  useEffect(() => {
    if (!isProfileDropdownOpen && !isMenuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (isProfileDropdownOpen && profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileDropdownOpen(false);
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isProfileDropdownOpen, isMenuOpen]);

  const closeMenus = useCallback(() => {
    setIsMenuOpen(false);
    setIsProfileDropdownOpen(false);
  }, []);

  const getCarsUrl = (preserveCurrentFilters = false) => {
    const params = new URLSearchParams();
    if (preserveCurrentFilters) {
      const currentParams = new URLSearchParams(window.location.search);
      FILTER_KEYS.forEach(key => {
        const value = currentParams.get(key);
        if (value) params.set(key, value);
      });
    }
    if (search.trim()) params.set('search', search.trim());
    const query = params.toString();
    return `/search${query ? `?${query}` : ''}`;
  };

  // Lets the checkout flow veto navigation (e.g. unsaved changes).
  // If a listener calls preventDefault(), it can call `resume` later to continue.
  const canNavigate = (url: string, resume: () => void) => {
    const event = new CustomEvent<string>('checkout:before-leave', {
      detail: url,
      cancelable: true
    }) as LeaveEvent;
    event.resume = resume;
    return window.dispatchEvent(event);
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const url = getCarsUrl(true);
    const navigate = () => {
      closeMenus();
      router.push(url);
    };
    if (!canNavigate(url, navigate)) return;
    navigate();
  };

  const onLogoutClick = async (confirmed = false) => {
    if (!confirmed && !canNavigate('/', () => { void onLogoutClick(true); })) return;
    try {
      await logout();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Odjava nije uspjela.');
      return;
    }
    setCurrentUser(null);
    closeMenus();
    router.push('/');
    router.refresh();
  };

  const pfpSrc = currentUser?.pfp ? `${API_URL}/${currentUser.pfp}` : `${API_URL}/default-pfp.jpg`;

  return (
      <nav className="sticky top-0 z-50 shadow-[0_4px_18px_rgba(15,23,42,0.10)]">
        {/* ---------- Top bar ---------- */}
        <div className="bg-[#a4473b] px-4">
          <div className="mx-auto flex h-13 max-w-7xl items-center justify-between gap-6">
            <Link href="/" onClick={closeMenus} className={`text-2xl font-bold text-white ${homepage ? 'tracking-tight' : ''}`}>
              AutoKlik
            </Link>

            {/* Desktop links */}
            <div className="hidden items-center space-x-3
              md:flex">
              <CompareLink className={navLinkClass} onClick={closeMenus} />
              <Link href="/mySavedAds" className={navLinkClass}>
                <HeartIcon className="h-5 w-5" />
                <span>Spremljeno</span>
              </Link>
              <Link href="/myMessages" className={navLinkClass}>
                <MessageCircleIcon className="h-5 w-5" />
                <span>Poruke</span>
              </Link>
              {currentUser && <MessageNotifications />}

              {currentUser ? (
                  <div className="relative" ref={profileRef}>
                    <button
                        type="button"
                        aria-haspopup="menu"
                        aria-expanded={isProfileDropdownOpen}
                        onClick={() => setIsProfileDropdownOpen(open => !open)}
                        className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-rose-100 transition-colors hover:bg-white/10 hover:text-white ${focusLight}`}
                    >
                      <Image
                          src={pfpSrc}
                          alt="Profil"
                          width={24}
                          height={24}
                          unoptimized
                          className="h-6 w-6 rounded-full object-cover ring-2 ring-white/20"
                      />
                      <span className="max-w-28 truncate">{currentUser.username}</span>
                      <ChevronDownIcon
                          className={`h-4 w-4 transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {isProfileDropdownOpen && (
                        <div
                            role="menu"
                            className="absolute right-0 z-50 mt-2 min-w-40 overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl"
                        >
                          <Link href="/myProfile" role="menuitem" onClick={closeMenus} className={dropdownItemClass}>
                            Moj profil
                          </Link>
                          <Link href="/mySettings" role="menuitem" onClick={closeMenus} className={dropdownItemClass}>
                            Postavke
                          </Link>
                          <button type="button" role="menuitem" onClick={() => void onLogoutClick()} className={dropdownItemClass}>
                            Odjava
                          </button>
                        </div>
                    )}
                  </div>
              ) : (
                  <Link href="/login" className={navLinkClass}>
                    <UserIcon className="h-5 w-5" />
                    <span>Prijava</span>
                  </Link>
              )}
            </div>

            {/* Mobile: notifications + menu toggle */}
            <div className="flex items-center gap-1
              md:hidden">
              {currentUser && <MessageNotifications />}
              <button
                  type="button"
                  aria-label={isMenuOpen ? 'Zatvori izbornik' : 'Otvori izbornik'}
                  aria-expanded={isMenuOpen}
                  aria-controls="mobile-menu"
                  onClick={() => setIsMenuOpen(open => !open)}
                  className={`rounded-md p-2 text-rose-100 transition-colors hover:text-white ${focusLight}`}
              >
                {isMenuOpen ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* ---------- Search bar ---------- */}
        <div className="bg-[#a3b18a] px-4 shadow-[inset_0_1px_0_#879875]">
          <div className="mx-auto grid min-h-14 max-w-7xl grid-cols-1 items-center gap-2 py-2
            sm:flex sm:justify-between sm:gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <form onSubmit={submitSearch} role="search" className="flex min-w-0 flex-1 items-center
                md:max-w-3xl">
                <input
                    type="search"
                    maxLength={200}
                    aria-label="Pretraži oglase"
                    placeholder="Pretraži oglase..."
                    value={search}
                    onChange={event => setSearch(event.currentTarget.value)}
                    className="h-10 min-w-0 flex-1 rounded-l-md border border-slate-300 bg-white px-3 text-slate-900 placeholder:text-slate-400 outline-none transition-shadow focus:border-rose-700 focus:ring-2 focus:ring-rose-700/20"
                />
                <button
                    type="submit"
                    aria-label="Pretraži"
                    className="flex h-10 items-center gap-2 rounded-r-md bg-[#a4473b] px-4 font-semibold text-white transition-colors hover:bg-[#87382e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#87382e]"
                >
                  <SearchIcon className="h-4 w-4" />
                  <span className="hidden
                    sm:inline">Pretraži</span>
                </button>
              </form>

              {SHOW_DEBUG_BUTTON && !homepage && (
                  <button
                      type="button"
                      onClick={() => localStorage.clear()}
                      className={`hidden ml-2 rounded-md bg-white px-3 py-1 text-sm font-semibold text-slate-600 ring-1 ring-inset ring-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700
                        lg:block`}
                  >
                    Delete localStorage
                  </button>
              )}
            </div>

            <Link href="/checkout/vehicle-category" onClick={closeMenus} className={`${ctaClass} min-h-10 justify-center`}>
              <PlusIcon className="h-5 w-5" />
              <span>Objavi oglas</span>
            </Link>
          </div>
        </div>

        {/* ---------- Mobile menu ---------- */}
        {isMenuOpen && (
            <div id="mobile-menu" className="rounded-b-xl bg-white shadow-[inset_0_1px_0_#e2e8f0]
              md:hidden">
              <div className="space-y-1 px-2 pb-3 pt-2
                sm:px-3">
                <Link href="/search" onClick={closeMenus} className={mobileLinkClass}>Oglasi</Link>
                <Link href="/checkout/vehicle-category" onClick={closeMenus} className={mobileLinkClass}>Objavi oglas</Link>
                <CompareLink className={mobileLinkClass} onClick={closeMenus} />
                {currentUser ? (
                    <>
                      <p className="px-3 py-2 text-sm font-semibold text-slate-900">{currentUser.username}</p>
                      <Link href="/myProfile" onClick={closeMenus} className={mobileLinkClass}>Moj profil</Link>
                      <Link href="/mySavedAds" onClick={closeMenus} className={mobileLinkClass}>Spremljeno</Link>
                      <Link href="/myMessages" onClick={closeMenus} className={mobileLinkClass}>Poruke</Link>
                      <Link href="/mySettings" onClick={closeMenus} className={mobileLinkClass}>Postavke</Link>
                      <button type="button" onClick={() => void onLogoutClick()} className={`${mobileLinkClass} w-full text-left`}>
                        Odjava
                      </button>
                    </>
                ) : (
                    <>
                      <Link href="/mySavedAds" onClick={closeMenus} className={mobileLinkClass}>Spremljeno</Link>
                      <Link href="/login" onClick={closeMenus} className={mobileLinkClass}>Prijava</Link>
                      <Link href="/register" onClick={closeMenus} className={mobileLinkClass}>Registracija</Link>
                    </>
                )}
              </div>
            </div>
        )}
      </nav>
  );
}
