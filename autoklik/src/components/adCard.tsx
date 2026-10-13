import Image from "next/image";
import Link from "next/link";
import { SaveAdButton } from './saveAdButton';

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
      <div className="h-full ">
        <Link href={href} className="group block h-full">
          <div className="relative aspect-[9/6] overflow-hidden bg-gray-100">
            <Image
              loading="eager"
              src={ad.previewImg}
              alt={ad.title}
              width={800}
              height={450}
              unoptimized={ad.previewImg === '/default_ad_img.png' || /^https?:\/\//i.test(ad.previewImg)}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex flex-col px-4 pt-2">
            <h3 className="truncate font-bold text-gray-900">{ad.title}</h3>
            <div className="grid grid-cols-3 text-sm gap-2">
                <span className="flex min-w-0 items-center gap-1 whitespace-nowrap"><Calendar1Icon className="shrink-0" /><span className="truncate">{ad.year}</span></span>
                <span className="flex min-w-0 items-center gap-1 whitespace-nowrap"><RoadIcon className="shrink-0" /><span className="truncate">{ad.kilometrage + " km"}</span></span>
                <span className="flex min-w-0 items-center gap-1 whitespace-nowrap"><EngineIcon className="shrink-0" /><span className="truncate">{ad.enginePower}</span></span>
                <span className="flex min-w-0 items-center gap-1 whitespace-nowrap"><FuelIcon className="shrink-0" /><span className="truncate">{ad.fuel}</span></span>
            </div>
            <div className="mt-1 justify-between border-t border-gray-200 pt-1 text-xs text-gray-700">
              <p className="mt-0.5 text-lg font-bold text-gray-950">{price + " €"}</p>
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
      </div>
    </article>
  );
}
