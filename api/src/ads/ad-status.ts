import { and, eq, gt, sql } from 'drizzle-orm';
import { ads, users } from '../db/schema';

export function publicSellerCondition() {
  return sql`exists (select 1 from ${users} where ${users.id} = ${ads.userId} and ${users.accountStatus} = 'active')`;
}

export function activeAdsCondition() {
  return and(eq(ads.status, 'active'), gt(ads.expiresAt, sql`now()`), publicSellerCondition());
}

export function effectiveAdStatus(ad: { status: string; expiresAt: Date }, now = new Date()) {
  return ad.status === 'active' && ad.expiresAt <= now ? 'expired' : ad.status;
}
