'use client';

import { useState } from 'react';
import Link from 'next/link';
import {ArrowLeftRightIcon} from 'lucide-react';
import { toggleComparisonAd, useComparisonIds } from '@/lib/compare-ads';

export function CompareAdButton({ adId, className = '', variant = 'button' }: { adId: number; className?: string; variant?: 'button' | 'link' }) {
  const ids = useComparisonIds();
  const selected = ids.includes(adId);
  const full = !selected && ids.length >= 3;
  const [error, setError] = useState('');

  const toggle = () => {
    try { toggleComparisonAd(adId); setError(''); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Odabir nije uspio.'); }
  };

  return (
    <div className={className}>
      <button type="button" aria-pressed={selected} aria-label={`${selected ? 'Ukloni iz usporedbe' : 'Usporedi oglas'} ${adId}`} disabled={full} title={full ? 'Za usporedbu možete odabrati najviše 3 oglasa.' : undefined} onClick={toggle} className={variant === 'link'
        ? 'w-fit cursor-pointer text-xs text-gray-700 underline underline-offset-2 hover:text-[#a4473b] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
        : `w-full rounded-md border px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${selected ? 'border-[#a4473b] bg-[#a4473b] text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}>
        {selected ? '✓ U usporedbi · ukloni' : full ? 'Usporedba je puna (3/3)' : 'Usporedi'}
      </button>
      {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function CompareLink({ className, onClick }: { className?: string; onClick?: () => void }) {
  const ids = useComparisonIds();
  return <Link href="/compare" className={className} onClick={onClick} aria-label={`Usporedi oglase (${ids.length}/3)`} title="Usporedi oglase"><span className="inline-flex items-center gap-1"><ArrowLeftRightIcon aria-hidden="true" className="h-4 w-4" /><span className="text-xs">{ids.length}/3</span></span></Link>;
}
