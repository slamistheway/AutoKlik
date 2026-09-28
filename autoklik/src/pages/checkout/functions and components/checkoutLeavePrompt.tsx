'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import * as checkoutState from '@/lib/checkout-state';

export default function CheckoutLeavePrompt() {
  const router = useRouter();
  const [pendingUrl, setPendingUrl] = useState('');
  const allowNavigation = useRef(false);
  const unloadConfirmationShown = useRef(false);

  useEffect(() => {
    const onRouteChangeStart = (url: string) => {
      if (allowNavigation.current) {
        allowNavigation.current = false;
        return;
      }

      const destination = new URL(url, window.location.origin).pathname;
      if (
        router.asPath.startsWith('/checkout') &&
        !destination.startsWith('/checkout') &&
        checkoutState.hasDraftContent()
      ) {
        setPendingUrl(url);
        const error = Object.assign(new Error('Checkout navigation cancelled'), { cancelled: true });
        router.events.emit('routeChangeError', error, url, { shallow: false });
        throw error;
      }
    };

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (router.asPath.startsWith('/checkout') && checkoutState.hasDraftContent()) {
        unloadConfirmationShown.current = true;
        event.preventDefault();
        event.returnValue = '';
      }
    };

    const onPageHide = () => {
      if (unloadConfirmationShown.current) checkoutState.reset();
    };



    router.events.on('routeChangeStart', onRouteChangeStart);
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      router.events.off('routeChangeStart', onRouteChangeStart);
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [router]);

  const continueNavigation = (saveDraft: boolean) => {
    if (!saveDraft) checkoutState.reset();
    const url = pendingUrl;
    setPendingUrl('');
    allowNavigation.current = true;
    void router.push(url);
  };

  if (!pendingUrl) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="presentation">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="checkout-leave-title">
        <h2 id="checkout-leave-title" className="text-lg font-semibold text-gray-900">Save your ad draft?</h2>
        <p className="mt-2 text-sm text-gray-600">You have started creating an ad. Would you like to save your draft before leaving?</p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={() => setPendingUrl('')} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700">
            Stay here
          </button>
          <button type="button" onClick={() => continueNavigation(false)} className="rounded-md bg-gray-200 px-4 py-2 text-sm text-gray-800">
            Leave without saving
          </button>
          <button type="button" onClick={() => continueNavigation(true)} className="rounded-md bg-[var(--color-navbar)] px-4 py-2 text-sm text-white">
            Save draft and leave
          </button>
        </div>
      </div>
    </div>
  );
}
