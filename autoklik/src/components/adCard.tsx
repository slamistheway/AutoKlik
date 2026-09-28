import Image from "next/image";
import Link from "next/link";
import { StarIcon } from 'lucide-react';

import '../app/globals.css';

export interface AdCardData {
  id: number;
  title: string;
  price: string;
  year: string;
  mileage: string;
  location: string;
  image: string;
  fuel?: string;
  condition?: string;
  sellerType?: string;
  sellerName?: string;
}

interface AdCardProps {
  ad: AdCardData;
  href: string;
}

export function AdCard({ ad, href }: AdCardProps) {
  const price = ad.price.includes('€')
    ? ad.price
    : `€ ${Number(ad.price).toLocaleString('en-US')}`;
  const sellerType = ad.sellerType === 'trgovac' ? 'Dealer' : 'Private';
  const condition = ad.condition === 'condition_new' ? 'New' : ad.condition === 'condition_used' ? 'Used' : null;

  return (
    <article className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-lg">
      <Link href={href} className="group block h-full">
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
          <Image
            loading="eager"
            src={ad.image}
            alt={ad.title}
            width={800}
            height={450}
            unoptimized={ad.image === '/default_ad_img.png' || /^https?:\/\//i.test(ad.image)}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="flex min-h-52 flex-col p-4">
          <h3 className="truncate text-sm font-bold text-gray-900">{ad.title}</h3>
          <p className="mt-2 text-lg font-bold text-gray-950">{price}</p>
          <p className="mt-2 min-h-9 text-xs leading-4 text-gray-600">
            {ad.year}{ad.year ? ' | ' : ''}{ad.mileage}{ad.mileage ? ' km' : ''}
            {ad.fuel ? ` | ${ad.fuel}` : ''}
          </p>
          {condition && <span className="mt-1 w-fit rounded-full bg-yellow-300 px-2 py-1 text-xs text-gray-900">{condition}</span>}
          <div className="mt-auto flex items-center justify-between border-t border-gray-200 pt-3 text-xs text-gray-700">
            <div>
              {(ad.sellerName || ad.sellerType) && <p>{ad.sellerName || sellerType}</p>}
              <p>{ad.location}</p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300" aria-hidden="true">
              <StarIcon className="h-5 w-5" />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
