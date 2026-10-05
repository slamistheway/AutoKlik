import Image from "next/image";
import Link from "next/link";
import { SaveAdButton } from './saveAdButton';

import '../app/globals.css';
import type {AdCardData} from '@/types/types';


interface AdCardProps {
  ad: AdCardData;
  href: string;
  currentUserId?: number | string | null;
}

export function AdCard({ ad, href, currentUserId }: AdCardProps) {
  const price = ad.price;
  const sellerType = ad.sellerType === 'trgovac' ? 'Dealer' : 'Private';

  return (
    <article className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-lg ">
      <div className="h-full ">
        <Link href={href} className="group block h-full">
          <div className="relative aspect-4/3 overflow-hidden bg-gray-100">
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
            <h3 className="truncate text-sm font-bold text-gray-900">{ad.title}</h3>
            <p className="mt-0.5 text-lg font-bold text-gray-950">{price}</p>
            <p className="mt-0.5 text-xs leading-4 text-gray-600">
              {ad.year}{ad.year ? ' | ' : ''}{ad.kilometrage}{ad.kilometrage ? ' km' : ''}
              {ad.fuel ? ` | ${ad.fuel}` : ''}
            </p>
            <div className="mt-1 justify-between border-t border-gray-200 pt-1 text-xs text-gray-700">
              <div>
                <p>{ad.county}</p>
              </div>
            </div>
          </div>
        </Link>
        {currentUserId !== undefined && Number(ad.userId) !== Number(currentUserId) && <div className="absolute right-3 top-3">
        <SaveAdButton
          adId={ad.id}
          initialSaved={ad.is_saved}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white/95 shadow-sm hover:bg-white"
        />
        </div>}
      </div>
    </article>
  );
}
