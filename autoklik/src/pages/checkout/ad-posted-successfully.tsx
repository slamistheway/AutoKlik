'use client';

import { useRouter } from 'next/router';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import {useEffect} from "react";
import * as checkoutState from './lib/checkout-state';

import {sessionCookie} from '@/components/cookies/cookies';


export default function AdPostedSuccessfullyPage() {
  const router = useRouter();
  useEffect(() => {
    const isLeavingCheckout = (url: string) => {
      const destination = new URL(url, window.location.origin);
      return destination.origin !== window.location.origin ||
        (destination.pathname !== '/checkout' && !destination.pathname.startsWith('/checkout/'));
    };
    const clearCheckoutWhenLeaving = (url: string) => {
      if (isLeavingCheckout(url)) checkoutState.reset();
    };
    const clearBeforeLinkNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(link instanceof HTMLAnchorElement) || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
      if (!['http:', 'https:'].includes(new URL(link.href).protocol)) return;
      clearCheckoutWhenLeaving(link.href);
    };
    const clearBeforeFullNavigation = (event: Event) => {
      clearCheckoutWhenLeaving((event as CustomEvent<string>).detail);
    };

    router.events.on('routeChangeStart', clearCheckoutWhenLeaving);
    document.addEventListener('click', clearBeforeLinkNavigation, true);
    window.addEventListener('checkout:before-leave', clearBeforeFullNavigation);
    return () => {
      router.events.off('routeChangeStart', clearCheckoutWhenLeaving);
      document.removeEventListener('click', clearBeforeLinkNavigation, true);
      window.removeEventListener('checkout:before-leave', clearBeforeFullNavigation);
    };
  }, [router.events]);

  const adIdParam = Number(router.query.adId);
  const adId = Number.isFinite(adIdParam) && adIdParam > 0 ? adIdParam : null;

  useEffect(() => {
    const token = sessionCookie.getSessionToken();
    if (!token) {
      router.push(`/login?returnUrl=${encodeURIComponent(router.asPath)}`);
      return;
    }
  }, []);

  const openBuyerView = () => {
    if (adId) {
      router.push(`/ad/${adId}`);
    }
  };

  return (
      <>
        <header>
          <Navbar />
        </header>

        <div className="min-h-screen bg-gray-50 py-8 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="rounded-lg border border-red-200 bg-white px-6 py-10 text-center space-y-4">
              <h1 className="text-3xl font-extrabold text-gray-900">Oglas je uspjesno objavljen</h1>
              <p className="text-sm text-gray-600">Vas oglas je sada javan i vidljiv kupcima.</p>

              <div className="pt-2">
                <button
                    type="button"
                    onClick={openBuyerView}
                    disabled={!adId}
                    className="px-5 py-2.5 rounded-md bg-[var(--color-navbar)] text-white hover:bg-[var(--color-navbar-hover)] disabled:opacity-50"
                >
                  Pogledaj oglas
                </button>
              </div>
            </div>
          </div>
        </div>

        <footer>
          <Footer />
        </footer>
      </>
  );
}
