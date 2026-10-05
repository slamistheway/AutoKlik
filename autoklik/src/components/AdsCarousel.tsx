'use client';

import { useMemo, useState, useEffect } from 'react';
import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react';
import { AdCard } from '@/components/adCard';
import {AdCardData} from "@/types/types";

interface AdsCarouselProps {
  ads: AdCardData[];
  errorMessage?: string;
  currentUserId?: number | string | null;
}


export function AdsCarousel({ ads, errorMessage, currentUserId }: AdsCarouselProps) {
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    useEffect(() => {
        const lgMedia = window.matchMedia('(min-width: 1024px)');

        const handleMediaChange = (e: MediaQueryListEvent) => {
            setPageSize(e.matches ? 10 : 6);
            setPage(0);
        };

        lgMedia.addEventListener('change', handleMediaChange);


        const frame = window.requestAnimationFrame(() => setPageSize(lgMedia.matches ? 10 : 6));

        return () => {
            window.cancelAnimationFrame(frame);
            lgMedia.removeEventListener('change', handleMediaChange);
        };
    }, []);



    const pages = useMemo(() => {
        const chunks: AdCardData[][] = [];
        for (let i = 0; i < ads.length; i += pageSize) {
            chunks.push(ads.slice(i, i + pageSize));
        }
        return chunks.length > 0 ? chunks : [[]];
    }, [ads, pageSize]);

    const lastPage = pages.length - 1;
    const activePage = Math.min(page, lastPage);
    const canGoLeft = activePage > 0;
    const canGoRight = activePage < lastPage;

    const goLeft = () => {
        if (canGoLeft) setPage(activePage - 1);
    };

    const goRight = () => {
        if (canGoRight) setPage(activePage + 1);
    };



    return (
    <div className="mt-6 grid grid-cols-[40px_minmax(0,1fr)_40px] items-stretch gap-3">
      <button
        type="button"
        onClick={goLeft}
        disabled={!canGoLeft}
        aria-label="Prethodna stranica oglasa"
        className="flex h-full w-full items-center justify-center rounded-xl border border-gray-200 bg-white text-[var(--color-navbar)] shadow-sm transition enabled:hover:border-[var(--color-navbar)] enabled:hover:bg-[var(--color-navbar)] enabled:hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-navbar)] disabled:cursor-not-allowed disabled:text-gray-300 disabled:shadow-none"
      >
        <ArrowLeftIcon className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="overflow-hidden">
        {errorMessage && <p role="alert" className="mb-4 text-sm text-red-700">{errorMessage}</p>}

        {/* Track: each page is 100% wide, holding two rows of ad cards. Sliding the track
            left/right by one page width is what produces the "swipe out, swipe in" effect. */}
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${activePage * 100}%)` }}
        >
          {pages.map((pageAds, pageIndex) => (
            <div
              key={pageIndex}
              className="grid w-full shrink-0 gap-4 grid-cols-3 grid-rows-2 lg:grid-cols-5"
            >
              {pageAds.map((ad) => (
                <AdCard key={ad.id} ad={ad} href={`/ad/${ad.id}`} currentUserId={currentUserId} />
              ))}
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={goRight}
        disabled={!canGoRight}
        aria-label="Sljedeća stranica oglasa"
        className="flex h-full w-full items-center justify-center rounded-xl border border-gray-200 bg-white text-[var(--color-navbar)] shadow-sm transition enabled:hover:border-[var(--color-navbar)] enabled:hover:bg-[var(--color-navbar)] enabled:hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-navbar)] disabled:cursor-not-allowed disabled:text-gray-300 disabled:shadow-none"
      >
        <ArrowRightIcon className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}
