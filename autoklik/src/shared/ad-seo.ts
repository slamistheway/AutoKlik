import type { AdFullData } from '@/types/types';

export function getAdPath(ad: {id: number; title: string}) {
  const slug = ad.title.toLowerCase().replace(/đ/g, 'd').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100).replace(/-+$/, '') || 'vozilo';
  return `/ad/${ad.id}/${slug}`;
}

function absoluteImage(path: string, siteUrl: string) {
  try {
    const base = path.replace(/^\/+/, '') === 'default_ad_img.png' ? siteUrl : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/+$/, '') + '/';
    const url = new URL(path, base);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined;
  } catch { return undefined; }
}

export function getAdSeo(ad: AdFullData, siteUrl: string) {
  const url = new URL(getAdPath(ad), siteUrl).href;
  const location = ad.county.replace(/_/g, '-');
  const details = [ad.title, ad.year, location].filter(Boolean).join(' · ');
  const description = (ad.description.trim() || `${details}. Pogledajte fotografije i detalje vozila na AutoKlik.`)
    .replace(/\s+/g, ' ').slice(0, 160);
  const image = absoluteImage(ad.images[0] || ad.previewImg || '/default_ad_img.png', siteUrl);
  const images = [...new Set((ad.images.length ? ad.images : [ad.previewImg || '/default_ad_img.png'])
    .map(path => absoluteImage(path, siteUrl)).filter((value): value is string => Boolean(value)))];
  const condition = ad.condition === 'condition_new' ? 'https://schema.org/NewCondition'
    : ad.condition === 'condition_used' ? 'https://schema.org/UsedCondition' : undefined;
  const price = ad.price.trim() === '' ? null : Number(ad.price);
  const structuredData = {
    '@context': 'https://schema.org', '@type': 'Vehicle', '@id': url + '#vehicle',
    name: ad.title, description: ad.description || description, url, image: images,
    ...(ad.brand ? {brand: {'@type': 'Brand', name: ad.brand}} : {}),
    ...(ad.model ? {model: ad.model} : {}),
    ...(ad.year ? {vehicleModelDate: String(ad.year)} : {}),
    ...(ad.kilometrage == null ? {} : {mileageFromOdometer: {'@type': 'QuantitativeValue', value: ad.kilometrage, unitCode: 'KMT'}}),
    ...(ad.fuel ? {fuelType: ad.fuel} : {}),
    ...(ad.driveType ? {driveWheelConfiguration: ad.driveType} : {}),
    ...(ad.gearCount == null ? {} : {numberOfForwardGears: ad.gearCount}),
    ...(ad.fuelConsumption == null ? {} : {fuelConsumption: {'@type': 'QuantitativeValue', value: ad.fuelConsumption, unitText: 'L/100 km'}}),
    ...(condition ? {itemCondition: condition} : {}),
    ...(price !== null && Number.isFinite(price) && price >= 0 ? {offers: {
      '@type': 'Offer', url, price: ad.price, priceCurrency: 'EUR',
      availability: ad.status === 'active' ? 'https://schema.org/InStock'
        : ad.status === 'sold' ? 'https://schema.org/SoldOut' : 'https://schema.org/OutOfStock',
      ...(ad.expiresAt ? {availabilityEnds: ad.expiresAt} : {}),
      ...(condition ? {itemCondition: condition} : {}),
      seller: {'@type': 'Person', name: ad.sellerUsername || 'Privatni oglašivač', url: new URL(`/seller/${ad.userId}`, siteUrl).href},
      ...(location ? {availableAtOrFrom: {'@type': 'Place', name: location}} : {}),
    }} : {}),
  };
  return {title: `${ad.title} | AutoKlik`, description, url, image, structuredData};
}

// Escape seller-controlled text so JSON-LD cannot terminate its script element.
export function serializeStructuredData(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}
