import { and, eq, gt, sql } from 'drizzle-orm';
import { ads } from '../db/schema';

export function activeAdsCondition() {
  return and(eq(ads.status, 'active'), gt(ads.expiresAt, sql`now()`));
}

export function effectiveAdStatus(ad: { status: string; expiresAt: Date }, now = new Date()) {
  return ad.status === 'active' && ad.expiresAt <= now ? 'expired' : ad.status;
}
