import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, gt, ne, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { activeAdsCondition } from './ad-status';
import { parseSearch, searchConditions } from './search-filters';

const {savedSearches, searchAlerts, ads} = schema;

@Injectable()
export class SavedSearchesService {
  constructor(@Inject('DRIZZLE_DB') private readonly db: NodePgDatabase<typeof schema>) {}

  list(userId: number) {
    return this.db.select().from(savedSearches).where(eq(savedSearches.userId, userId)).orderBy(desc(savedSearches.id));
  }

  async create(userId: number, body: unknown) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BadRequestException('Neispravna pretraga.');
    const input = body as Record<string, unknown>;
    if (Object.keys(input).some(key => !['name', 'filters'].includes(key)) || typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 100) throw new BadRequestException('Unesite naziv do 100 znakova.');
    const filters = parseSearch(input.filters, false);
    return this.db.transaction(async tx => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`saved-searches:${userId}`}, 0))`);
      const [count] = await tx.select({total: sql<number>`count(*)::int`}).from(savedSearches).where(eq(savedSearches.userId, userId));
      if (count.total >= 25) throw new BadRequestException('Možete spremiti najviše 25 pretraga.');
      const [search] = await tx.insert(savedSearches).values({userId, name: input.name!.toString().trim(), filters}).returning();
      return search;
    });
  }

  async update(userId: number, id: number, body: unknown) {
    this.validateId(id);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BadRequestException('Neispravna promjena.');
    const input = body as Record<string, unknown>;
    if (Object.keys(input).length !== 1 || typeof input.alertsEnabled !== 'boolean') throw new BadRequestException('Neispravna postavka obavijesti.');
    const [updated] = await this.db.update(savedSearches).set({alertsEnabled: input.alertsEnabled})
      .where(and(eq(savedSearches.id, id), eq(savedSearches.userId, userId))).returning();
    if (!updated) throw new NotFoundException('Pretraga nije pronađena.');
    return updated;
  }

  async remove(userId: number, id: number) {
    this.validateId(id);
    const [removed] = await this.db.delete(savedSearches).where(and(eq(savedSearches.id, id), eq(savedSearches.userId, userId))).returning({id: savedSearches.id});
    if (!removed) throw new NotFoundException('Pretraga nije pronađena.');
    return removed;
  }

  async alerts(userId: number) {
    // Materialize new matches on notification refresh. Unique keys preserve read state
    // across tabs/retries and prevent duplicate alerts for the same search and ad.
    await this.db.transaction(async tx => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`saved-searches:${userId}`}, 0))`);
      const searches = await tx.select().from(savedSearches).where(and(eq(savedSearches.userId, userId), eq(savedSearches.alertsEnabled, true)));
      for (const search of searches) {
        const matches = and(activeAdsCondition(), ne(ads.userId, userId), gt(ads.dateCreated, search.createdAt), ...searchConditions(parseSearch(search.filters, false)));
        await tx.execute(sql`insert into ${searchAlerts} (saved_search_id, ad_id) select ${search.id}, ${ads.id} from ${ads} where ${matches} on conflict (saved_search_id, ad_id) do nothing`);
      }
    });
    const visible = and(eq(savedSearches.userId, userId), eq(savedSearches.alertsEnabled, true), activeAdsCondition());
    const items = await this.db.select({id: searchAlerts.id, adId: ads.id, title: ads.title, searchName: savedSearches.name, readAt: searchAlerts.readAt})
      .from(searchAlerts).innerJoin(savedSearches, eq(savedSearches.id, searchAlerts.savedSearchId)).innerJoin(ads, eq(ads.id, searchAlerts.adId))
      .where(visible).orderBy(desc(sql`${searchAlerts.readAt} is null`), desc(searchAlerts.id)).limit(30);
    const [count] = await this.db.select({total: sql<number>`count(*)::int`})
      .from(searchAlerts).innerJoin(savedSearches, eq(savedSearches.id, searchAlerts.savedSearchId)).innerJoin(ads, eq(ads.id, searchAlerts.adId))
      .where(and(visible, sql`${searchAlerts.readAt} is null`));
    return {items, unreadCount: count.total};
  }

  async readAlert(userId: number, id: number) {
    this.validateId(id);
    const [updated] = await this.db.update(searchAlerts).set({readAt: sql`coalesce(${searchAlerts.readAt}, now())`})
      .where(and(eq(searchAlerts.id, id), sql`exists (select 1 from ${savedSearches} where ${savedSearches.id} = ${searchAlerts.savedSearchId} and ${savedSearches.userId} = ${userId})`)).returning({id: searchAlerts.id});
    if (!updated) throw new NotFoundException('Obavijest nije pronađena.');
    return updated;
  }

  private validateId(id: number) {
    if (!Number.isSafeInteger(id) || id <= 0) throw new BadRequestException('Neispravan identifikator.');
  }
}
