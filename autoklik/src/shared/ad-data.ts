import type { AdFullData, AdCardData } from '@/types/types';

type ApiAdData = {
  id: number;
  user_id: number;
  seller_username?: string | null;
  category?: string | null;
  subcategory?: string | null;
  brand?: string | null;
  model?: string | null;
  title?: string | null;
  description?: string | null;
  year?: number | null;
  price?: string | null;
  kilometrage?: number | null;
  fuel?: string | null;
  condition?: string | null;
  county?: string | null;
  seller_type?: string | null;
  buy_or_lease?: string | null;
  gear_type?: string | null;
  color?: string | null;
  door_number?: number | null;
  driving_licence?: string | null;
  weight?: number | null;
  payload?: number | null;
  volume?: number | null;
  preview_img?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  images?: string[];
  is_saved?: boolean;
};

export function toAdCardData(data: unknown): AdCardData {
  const ad = data as ApiAdData;
  return {
    id: ad.id,
    userId: ad.user_id,
    category: ad.category ?? '',
    subcategory: ad.subcategory ?? '',
    brand: ad.brand ?? '',
    model: ad.model ?? '',
    title: ad.title ?? 'Oglas bez naslova',
    description: ad.description ?? '',
    year: ad.year ?? null,
    price: ad.price ?? '',
    kilometrage: ad.kilometrage ?? null,
    fuel: ad.fuel ?? '',
    condition: ad.condition ?? '',
    county: ad.county ?? '',
    sellerType: ad.seller_type ?? '',
    buyOrLease: ad.buy_or_lease ?? '',
    gearType: ad.gear_type ?? '',
    color: ad.color ?? '',
    doorNumber: ad.door_number ?? null,
    drivingLicence: ad.driving_licence ?? '',
    weight: ad.weight ?? null,
    payload: ad.payload ?? null,
    volume: ad.volume ?? null,
    previewImg: ad.preview_img ?? '/default_ad_img.png',
    dateCreated: ad.created_at ?? null,
    dateLastUpdated: ad.updated_at ?? null,
    sellerUsername: ad.seller_username ?? null,
    is_saved: ad.is_saved ?? false,
  };
}

export function toAdFullData(data: unknown): AdFullData {
  const ad = data as ApiAdData;
  return { ...toAdCardData(ad), images: ad.images ?? [] };
}
