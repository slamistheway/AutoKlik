'use client';
import { API_BASE_URL } from '@/shared/api-url';

import { useEffect, useState, type ComponentType } from 'react';
import { useRouter } from 'next/router';
import {CurrentUser} from "@/types/types";
import {sessionCookie} from '@/components/cookies/cookies';





export function isAuthenticated() {
  if (typeof window === 'undefined') return false;

  try {
    return Boolean(sessionCookie.getSessionToken());
  } catch {
    return false;
  }
}

export async function fetchCurrentUser(): Promise<CurrentUser> {
  const token = sessionCookie.getSessionToken();
  if (!token) throw new Error('Niste prijavljeni.');

  const response = await fetch(`${API_BASE_URL}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
    redirect: 'error',
  });
  if (!response.ok) {
    if ((response.status === 401 || response.status === 403) && sessionCookie.getSessionToken() === token) clearSessionToken();
    throw new Error('Nije moguće dohvatiti korisnički profil.');
  }

  return response.json() as Promise<CurrentUser>;
}

export async function logout() {
  const token = sessionCookie.getSessionToken();
  if (token) {
    const response = await fetch(`${API_BASE_URL}/users/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok && response.status !== 401) {
      throw new Error('Odjava nije uspjela. Pokušajte ponovno.');
    }
  }
  clearSessionToken();
}


export function authGuard<P extends object>(Page: ComponentType<P>) {
  function AuthenticatedPage(props: P) {
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
      if (!router.isReady) return;
      let active = true;
      void fetchCurrentUser().then(() => {
        if (active) setAuthorized(true);
      }).catch(() => {
        if (!active) return;
        setAuthorized(false);
        const returnUrl = encodeURIComponent(router.asPath);
        void router.replace(`/login?returnUrl=${returnUrl}`);
      });
      return () => { active = false; };
    }, [router, router.isReady, router.asPath]);

    return authorized ? <Page {...props} /> : null;
  }

  AuthenticatedPage.displayName = `authGuard(${Page.displayName ?? Page.name ?? 'Page'})`;
  return AuthenticatedPage;
}

export function guestOnlyAuthGuard<P extends object>(Page: ComponentType<P>) {
  function GuestOnlyPage(props: P) {
    const router = useRouter();
    const [isGuest, setIsGuest] = useState(false);

    useEffect(() => {
      if (!router.isReady) return;
      let active = true;
      void fetchCurrentUser().then(() => {
        if (active) void router.replace('/');
      }).catch(() => {
        if (active) setIsGuest(true);
      });
      return () => { active = false; };
    }, [router, router.isReady]);

    return isGuest ? <Page {...props} /> : null;
  }

  GuestOnlyPage.displayName = `guestOnlyAuthGuard(${Page.displayName ?? Page.name ?? 'Page'})`;
  return GuestOnlyPage;
}

export function clearSessionToken() {
  if (typeof window === 'undefined') return;
  sessionCookie.removeSessionToken();
}

export function clearLocalStorage(){
  localStorage.clear();
}
