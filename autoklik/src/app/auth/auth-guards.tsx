'use client';

import { useEffect, useState, type ComponentType } from 'react';
import { useRouter } from 'next/router';
import {CurrentUser} from "@/types/types";

const AUTH_STORAGE_KEY = 'autoklik.authenticated';
const SESSION_TOKEN_KEY = 'sessionApiToken';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';



export function isAuthenticated() {
  if (typeof window === 'undefined') return false;

  try {
    return Boolean(window.sessionStorage.getItem(SESSION_TOKEN_KEY)) &&
      window.sessionStorage.getItem(AUTH_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export async function fetchCurrentUser(): Promise<CurrentUser> {
  const token = window.sessionStorage.getItem(SESSION_TOKEN_KEY);
  if (!token) throw new Error('Niste prijavljeni.');

  const response = await fetch(`${API_BASE_URL}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) clearSessionToken();
    throw new Error('Nije moguće dohvatiti korisnički profil.');
  }

  return response.json() as Promise<CurrentUser>;
}

export function setAuthenticated() {
  window.sessionStorage.setItem(AUTH_STORAGE_KEY, 'true');
}

export function authGuard<P extends object>(Page: ComponentType<P>) {
  function AuthenticatedPage(props: P) {
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
      if (!router.isReady) return;
      if (isAuthenticated()) {
        setAuthorized(true);
        return;
      }

      const returnUrl = encodeURIComponent(router.asPath);
      void router.replace(`/login?returnUrl=${returnUrl}`);
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
      if (!isAuthenticated()) {
        setIsGuest(true);
        return;
      }

      void router.replace('/');
    }, [router, router.isReady]);

    return isGuest ? <Page {...props} /> : null;
  }

  GuestOnlyPage.displayName = `guestOnlyAuthGuard(${Page.displayName ?? Page.name ?? 'Page'})`;
  return GuestOnlyPage;
}

export function clearSessionToken() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
  window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

export function clearLocalStorage(){
  localStorage.clear();
}
