import type { AdCardData } from '@/types/types';

export const adStatusLabels = { active: 'Aktivan', sold: 'Prodano', hidden: 'Skriven', expired: 'Istekao' };

export function getAdStatus(ad: Pick<AdCardData, 'status' | 'expiresAt'>) {
  const status = ad.status ?? 'active';
  return status === 'active' && ad.expiresAt && Date.parse(ad.expiresAt) <= Date.now() ? 'expired' : status;
}
