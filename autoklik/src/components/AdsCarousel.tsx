'use client';

import { useMemo, useState, useEffect } from 'react';
import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react';
import { AdCard } from '@/components/adCard';
import {AdCardData} from "@/types/types";

interface AdsCarouselProps {
  ads: AdCardData[];
  errorMessage?: string;
}


export function AdsCarousel({ ads, errorMessage }: AdsCarouselProps) {
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(5);

    useEffect(() => {
        const lgMedia = window.matchMedia('(min-width: 1024px)');

        const handleMediaChange = (e: MediaQueryListEvent) => {
            setPageSize(e.matches ? 5 : 3);
        };

        lgMedia.addEventListener('change', handleMediaChange);


        setPageSize(lgMedia.matches ? 5 : 3);

        return () => lgMedia.removeEventListener('change', handleMediaChange);
    }, []);



    const pages = useMemo(() => {
        const chunks: AdCardData[][] = [];
        for (let i = 0; i < ads.length; i += pageSize) {
            chunks.push(ads.slice(i, i + pageSize));
        }
        return chunks.length > 0 ? chunks : [[]];
    }, [ads, pageSize]);

    const lastPage = pages.length - 1;
    const canGoLeft = page > 0;
    const canGoRight = page < lastPage;

    const goLeft = () => {
        if (canGoLeft) setPage((p) => p - 1);
    };

    const goRight = () => {
        if (canGoRight) setPage((p) => p + 1);
    };



    return (
    <div className="flex items-end justify-between gap-4 mt-6">
      <button
        type="button"
        onClick={goLeft}
        disabled={!canGoLeft}
        aria-label="Prethodnih X oglasa"
        className="float relative top-0 left-0 shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ArrowLeftIcon />
      </button>

      <div className="flex-1 overflow-hidden">
        {errorMessage && <p role="alert" className="mb-4 text-sm text-red-700">{errorMessage}</p>}

        {/* Track: each page is 100% wide, holding up to 5 ad cards. Sliding the track
            left/right by one page width is what produces the "swipe out, swipe in" effect. */}
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${page * 100}%)` }}
        >
          {pages.map((pageAds, pageIndex) => (
            <div
              key={pageIndex}
              className="grid w-full shrink-0 gap-4 grid-cols-3 lg:grid-cols-5"
            >
              {pageAds.map((ad) => (
                <AdCard key={ad.id} ad={ad} href={`/ad/${ad.id}`} />
              ))}
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={goRight}
        disabled={!canGoRight}
        aria-label="Sljedećih X oglasa"
        className="relative top-0 left-0 shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ArrowRightIcon />
      </button>
    </div>
  );
}
