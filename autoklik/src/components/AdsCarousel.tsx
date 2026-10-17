'use client';

import {useMemo, useState, useEffect} from 'react';
import {ArrowBigLeft, ArrowBigRight} from 'lucide-react';
import {getAdPath} from '@/shared/ad-seo';
import {AdCard} from '@/components/adCard';
import type {AdCardData} from '@/types/types';

interface AdsCarouselProps {
  ads: AdCardData[];
  errorMessage?: string;
  currentUserId?: number | string | null;
  rows?: 1 | 2;
}

// Keep these media queries aligned with the grid's sm / lg / xl / 2xl classes.
const columnBreakpoints = [640, 1024, 1280, 1536];
const arrowClass = `flex size-10 items-center justify-center rounded-full text-[var(--color-navbar)] transition
  enabled:hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-offset-2
  disabled:text-gray-300
  md:size-8`;

export function AdsCarousel({ads, errorMessage, currentUserId, rows = 2}: AdsCarouselProps) {
  const [page, setPage] = useState(0);
  const [columns, setColumns] = useState(1);
  const pageSize = columns * rows;

  useEffect(() => {
    const queries = columnBreakpoints.map(width => window.matchMedia(`(min-width: ${width}px)`));
    const updateColumns = () => {
      setColumns(1 + queries.filter(query => query.matches).length);
      setPage(0);
    };
    queries.forEach(query => query.addEventListener('change', updateColumns));
    const frame = window.requestAnimationFrame(updateColumns);
    return () => {
      window.cancelAnimationFrame(frame);
      queries.forEach(query => query.removeEventListener('change', updateColumns));
    };
  }, []);

  const pages = useMemo(() => {
    const chunks: AdCardData[][] = [];
    for (let index = 0; index < ads.length; index += pageSize) chunks.push(ads.slice(index, index + pageSize));
    return chunks.length ? chunks : [[]];
  }, [ads, pageSize]);
  const activePage = Math.min(page, pages.length - 1);

  if (!ads.length) return <p role={errorMessage ? 'alert' : undefined} className={`mt-3 text-sm ${errorMessage ? 'text-red-700' : 'text-gray-500'}`}>{errorMessage || 'Trenutačno nema oglasa.'}</p>;

  return (
    <div className="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2
      md:grid-cols-[32px_minmax(0,1fr)_32px] md:gap-3">
      <button type="button" disabled={activePage === 0} aria-label="Prethodna stranica oglasa" onClick={() => setPage(activePage - 1)}
        className={`col-start-2 row-start-2 ${arrowClass}
          md:col-start-1 md:row-start-1`}>
        <ArrowBigLeft aria-hidden="true" className="size-7" />
      </button>
      <div className="col-span-3 col-start-1 row-start-1 min-w-0 overflow-hidden
        md:col-span-1 md:col-start-2">
        {errorMessage && <p role="alert" className="mb-4 text-sm text-red-700">{errorMessage}</p>}
        <div className="flex items-start transition-transform duration-300 motion-reduce:transition-none" style={{transform: `translateX(-${activePage * 100}%)`}}>
          {pages.map((pageAds, pageIndex) => (
            <div key={pageIndex} aria-hidden={pageIndex !== activePage} inert={pageIndex !== activePage}
              className="grid w-full min-w-0 shrink-0 auto-rows-fr grid-cols-1 gap-4
                sm:grid-cols-2
                lg:grid-cols-3
                xl:grid-cols-4
                2xl:grid-cols-5">
              {pageAds.map(ad => <AdCard key={ad.id} ad={ad} href={getAdPath(ad)} currentUserId={currentUserId} />)}
            </div>
          ))}
        </div>
      </div>
      <p aria-live="polite" className="col-start-1 row-start-2 text-xs text-gray-600
        md:sr-only">Stranica {activePage + 1} od {pages.length}</p>
      <button type="button" disabled={activePage === pages.length - 1} aria-label="Sljedeća stranica oglasa" onClick={() => setPage(activePage + 1)}
        className={`col-start-3 row-start-2 ${arrowClass}
          md:row-start-1`}>
        <ArrowBigRight aria-hidden="true" className="size-7" />
      </button>
    </div>
  );
}
