import Image from "next/image";
import Link from "next/link";
import { SaveAdButton } from './saveAdButton';
import { CompareAdButton } from './compare-controls';
import { adStatusLabels, getAdStatus } from '@/shared/ad-status';

import '../app/globals.css';
import type {AdCardData} from '@/types/types';
import {Calendar1Icon, EngineIcon, FuelIcon, RoadIcon} from "lucide-react";


interface AdCardProps {
  ad: AdCardData;
  href: string;
  currentUserId?: number | string | null;
}

export function AdCard({ ad, href, currentUserId }: AdCardProps) {
  const price = ad.price;
  const sellerType = ad.sellerType === 'trgovac' ? 'Dealer' : 'Private';

  return (
    <article className="relative overflow-hidden border border-gray-200 bg-white shadow-sm transition hover:shadow-lg ">
      <div className="flex h-full flex-col">
        <Link href={href} className="group block flex-1">
          <div className="relative aspect-[9/6] overflow-hidden bg-gray-100">
            <Image
              loading="eager"
              src={ad.previewImg}
              alt={ad.title}
              width={800}
              height={450}
              unoptimized={ad.previewImg === '/default_ad_img.png' || /^https?:\/\//i.test(ad.previewImg)}
              className="h-full w-full object-cover"
              onError={event => { event.currentTarget.src = '/default_ad_img.png'; }}
            />
            {getAdStatus(ad) !== 'active' && <span className="absolute left-2 top-2 rounded-md bg-gray-900 px-2 py-1 text-xs font-semibold text-white">{adStatusLabels[getAdStatus(ad)]}</span>}
          </div>
          <div className="flex flex-col px-4 pt-2">
            <h3 className="truncate font-bold text-gray-900">{ad.title}</h3>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                <span className="flex max-w-full min-w-0 items-center gap-1"><Calendar1Icon className="size-4 shrink-0" /><span className="[overflow-wrap:anywhere]">{ad.year}</span></span>
                <span className="flex max-w-full min-w-0 items-center gap-1"><RoadIcon className="size-4 shrink-0" /><span className="[overflow-wrap:anywhere]">{ad.kilometrage + " km"}</span></span>
                <span className="flex max-w-full min-w-0 items-center gap-1"><EngineIcon className="size-4 shrink-0" /><span className="[overflow-wrap:anywhere]">{ad.enginePower}</span></span>
                <span className="flex max-w-full min-w-0 items-center gap-1"><FuelIcon className="size-4 shrink-0" /><span className="[overflow-wrap:anywhere]">{ad.fuel}</span></span>
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-gray-200 pt-1 text-xs text-gray-700">
              <p className="mt-0.5 min-w-0 text-lg font-bold text-gray-950 [overflow-wrap:anywhere]">{price + " €"}</p>
            </div>
          </div>
        </Link>
        <div className="absolute right-2 top-2">
        <SaveAdButton
          adId={ad.id}
          initialSaved={ad.is_saved}
          className="flex h-7 aspect-square items-center justify-center rounded-lg border border-gray-300 bg-white/95 shadow-sm hover:bg-white"
        />
        </div>
        <CompareAdButton adId={ad.id} variant="link" className="mt-1 px-4 pb-2" />
      </div>
    </article>
  );
}
