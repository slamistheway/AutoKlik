import type { AdFullData, AdCardData } from '@/types/types';

type ApiAdData = {
  body_type?: string | null;
  air_conditioning?: string | null;
  airbags?: number | null;
  car_radio?: string | null;
  seat_count?: number | null;
  tire_width?: number | null;
  tire_height?: number | null;
  tire_diameter?: number | null;
  emission_class?: string | null;
  vin?: string | null;
  moderation_status?: string | null;
  moderation_reason?: string | null;
  id: number;
  view_count?: number;
  status?: AdCardData['status'];
  expires_at?: string | null;
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
  engine_power?: number | null;
  engine_size?: number | null;
  fuel?: string | null;
  condition?: string | null;
  county?: string | null;
  seller_type?: string | null;
  buy_or_lease?: string | null;
  drive_type?: string | null;
  gear_count?: number | null;
  fuel_consumption?: string | number | null;
  warranty?: string | null;
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
    viewCount: ad.view_count ?? 0,
    status: ad.status ?? 'active',
    expiresAt: ad.expires_at ?? null,
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
    enginePower: ad.engine_power ?? null,
    fuel: ad.fuel ?? '',
    condition: ad.condition ?? '',
    county: ad.county ?? '',
    sellerType: ad.seller_type ?? '',
    buyOrLease: ad.buy_or_lease ?? '',
    driveType: ad.drive_type ?? null,
    gearCount: ad.gear_count ?? null,
    fuelConsumption: ad.fuel_consumption == null ? null : Number(ad.fuel_consumption),
    warranty: ad.warranty ?? null,
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
  return {
    bodyType: ad.body_type ?? null,
    airConditioning: ad.air_conditioning ?? null,
    airbags: ad.airbags ?? null,
    carRadio: ad.car_radio ?? null,
    seatCount: ad.seat_count ?? null,
    tireWidth: ad.tire_width ?? null,
    tireHeight: ad.tire_height ?? null,
    tireDiameter: ad.tire_diameter ?? null,
    emissionClass: ad.emission_class ?? null,
    ...toAdCardData(ad), engineSize: ad.engine_size ?? null, vin: ad.vin ?? null, moderationStatus: ad.moderation_status ?? null, moderationReason: ad.moderation_reason ?? null, enginePower: ad.engine_power ?? null, images: ad.images ?? [] };
}
