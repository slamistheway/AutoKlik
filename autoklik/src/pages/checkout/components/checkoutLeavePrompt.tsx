'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import * as checkoutState from '../lib/checkout-state';

function hasUnsavedDraft(): boolean {
  return checkoutState.hasCategoryState() || checkoutState.hasDetailsState();
}

export default function CheckoutLeavePrompt() {
  const router = useRouter();
  const pathname = usePathname();
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const bypassRef = useRef(false);
  const isOpen = pendingUrl !== null;


  /* -------------------- Intercept clicks on <a>/Link elements -------------------- */
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (bypassRef.current) return;
      if (!hasUnsavedDraft()) return;
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as HTMLElement)?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;

      const url = new URL(anchor.href, window.location.origin);
      const isSameOrigin = url.origin === window.location.origin;
      const isSamePath = url.pathname === window.location.pathname && url.search === window.location.search;
      const opensNewTab = anchor.target === '_blank';

      if (!isSameOrigin || isSamePath || opensNewTab) return;

      event.preventDefault();
      setPendingUrl(url.pathname + url.search + url.hash);
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  /* -------------------- Intercept browser back/forward -------------------- */
  useEffect(() => {
    // Push a sentinel state so a back/forward press triggers popstate we can intercept
    // instead of immediately navigating away.
    window.history.pushState({ checkoutGuard: true }, '', window.location.href);

    const onPopState = () => {
      if (bypassRef.current) {
        bypassRef.current = false;
        return;
      }

      if (!hasUnsavedDraft()) return;

      // Cancel the back/forward navigation by re-pushing the current URL, then show the prompt.
      // We don't know the exact target URL for back/forward, so default to the site root.
      window.history.pushState({ checkoutGuard: true }, '', window.location.href);
      setPendingUrl('/');
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const stayHere = useCallback(() => {
    setPendingUrl(null);
  }, []);

  function continueNavigation(bool: boolean) {

  }



  if (!isOpen) {
    return null;
  }

  return (
      <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4" role="presentation">
        <div
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-leave-title"
        >
          <h2 id="checkout-leave-title" className="text-lg font-semibold text-gray-900">
            Save your ad draft?
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            You have started creating an ad. Would you like to save your draft before leaving?
          </p>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button
                type="button"
                onClick={stayHere}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700"
            >
              Stay here
            </button>

            <button
                type="button"
                onClick={() => continueNavigation(false)}
                className="rounded-md bg-gray-200 px-4 py-2 text-sm text-gray-800"
            >
              Leave without saving
            </button>

            <button
                type="button"
                onClick={() => continueNavigation(true)}
                className="rounded-md bg-[var(--color-navbar)] px-4 py-2 text-sm text-white"
            >
              Save draft and leave
            </button>
          </div>
        </div>
      </div>
  );
}