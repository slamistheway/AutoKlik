'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {clearLocalStorage, clearSessionToken, fetchCurrentUser} from '@/app/auth/auth-guards';
import {CurrentUser} from "@/types/types";


const linkClass = 'px-3 py-2 text-sm font-medium text-red-50 hover:text-red-200';
const mobileLinkClass = 'block rounded-md px-3 py-2 text-base font-medium text-red-50 hover:bg-red-600 hover:text-white';

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

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

  function getProfileImageUrl(user: CurrentUser | null): string {
    const pfp = user?.pfp?.trim();
    if (!pfp) {
      console.log("No profile picture found, using default.");
      return 'http://localhost:3001/default-pfp.jpg';
    }

    return `http://localhost:3001/${pfp}`;
  }




  const onLogoutClick = () => {
    clearSessionToken();
    setCurrentUser(null);
    closeMenus();
    window.location.assign(new URL('/', window.location.origin).toString());
  };

  return (
    <nav className="bg-[var(--color-navbar)] drop-shadow-xl">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-12 items-center justify-between">
          <Link href="/" onClick={closeMenus} className="text-2xl font-bold text-white">AutoKlik</Link>

          <div className="hidden items-center space-x-2 md:flex">
            <Link href="/checkout" className={linkClass}>Objavi oglas</Link>

            <Link href="/" onClick={() => clearLocalStorage()} className={linkClass}>Clear localStorage</Link>
            <Link href="/" onClick={() => clearSessionToken()} className={linkClass}>Clear session</Link>

            {currentUser ? (
              <div className="relative">

                {/*PROFILE*/}
                <button type="button" aria-expanded={isProfileDropdownOpen}
                  onClick={() => setIsProfileDropdownOpen(previous => !previous)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-50 hover:text-red-200"
                >
                  <img src={getProfileImageUrl(currentUser)} alt="Profile" className="h-6 w-6 rounded-full object-cover" />
                  <span>
                    {currentUser.username} {isProfileDropdownOpen ? '▲' : '▼'}
                  </span>
                </button>

                {/*PROFILE DROPDOWN*/}
                {isProfileDropdownOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-40 rounded-md border border-red-700 bg-[var(--color-footer)] shadow-lg">
                    <Link href="/myProfile" onClick={closeMenus} className="block px-4 py-2 text-sm text-red-50 hover:bg-red-600">Moj profil</Link>
                    <Link href="/mySettings" onClick={closeMenus} className="block px-4 py-2 text-sm text-red-50 hover:bg-red-600">Postavke</Link>
                    <button type="button" onClick={onLogoutClick} className="block w-full px-4 py-2 text-left text-sm text-red-50 hover:bg-red-600">Odjava</button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/login" className={linkClass}>Prijava</Link>
              </>
            )}
          </div>

          <button type="button" aria-label={isMenuOpen ? 'Zatvori izbornik' : 'Otvori izbornik'}
            aria-expanded={isMenuOpen} onClick={() => setIsMenuOpen(previous => !previous)}
            className="rounded-md p-2 text-red-50 hover:text-red-200 md:hidden">
            {isMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="rounded-b-xl bg-[var(--color-footer)] md:hidden">
          <div className="space-y-1 px-2 pb-3 pt-2 sm:px-3">
            <Link href="/checkout/vehicle-category" onClick={closeMenus} className={mobileLinkClass}>Objavi oglas</Link>
            {currentUser ? (
              <>
                <p className="px-3 py-2 text-sm font-semibold text-red-50">{currentUser.username}</p>
                <Link href="/myProfile" onClick={closeMenus} className={mobileLinkClass}>Moj profil</Link>
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
  );
}
