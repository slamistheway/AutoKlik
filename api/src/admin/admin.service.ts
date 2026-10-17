import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, getTableColumns, gte, ilike, inArray, isNull, lt, ne, or, sql, type SQL } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { validateInput } from '../input-validation';
import { dateInput, moderationInput, note, object, periodInput, positiveId } from './admin-validation';
import { activeAdsCondition, effectiveAdStatus } from '../ads/ad-status';
import { imageDigest } from './image-digest';

const { ads, users, adImages, moderationReports: reports, adminActions: actions } = schema;
const adProjection = { ...getTableColumns(ads), dateCreated: sql<Date>`${ads.dateCreated} at time zone current_setting('TimeZone')`.mapWith(actions.createdAt) };
type Transaction = Parameters<Parameters<NodePgDatabase<typeof schema>['transaction']>[0]>[0];

@Injectable()
export class AdminService {
  constructor(@Inject('DRIZZLE_DB') private readonly db: NodePgDatabase<typeof schema>) {}

  async dashboard(value: unknown = 'week') {
    const { period, hours, bucket } = periodInput(value);
    const now = new Date();
    const start = new Date(now);
    if (bucket === 'hour') start.setUTCMinutes(0, 0, 0);
    else start.setUTCHours(0, 0, 0, 0);
    start.setUTCHours(start.getUTCHours() - (hours - (bucket === 'hour' ? 1 : 24)));
    const since = start.toISOString();
    const [stats, queues, chart, activity, newUsers] = await Promise.all([
      this.db.execute(sql`select
        (select count(*)::int from ads) as "totalAds",
        (select count(*)::int from ads where status = 'active' and expires_at > now() and exists (select 1 from users u where u.id = ads.user_id and u.account_status = 'active')) as "activeAds",
        (select count(*)::int from users where account_status <> 'deleted') as "totalUsers",
        (select count(*)::int from ads where date_created >= ${since}::timestamptz at time zone current_setting('TimeZone')) as "newAds",
        (select count(*)::int from users where date_created >= ${since}::timestamptz at time zone current_setting('TimeZone')) as "newUsers",
        (select count(*)::int from messages where created_at >= ${since}::timestamptz) as "messagesSent",
        (select count(*)::int from ads where status = 'sold' and sold_at >= ${since}::timestamptz) as "soldAds",
        (select count(*)::int from ads where status = 'active' and expires_at <= now() and expires_at >= ${since}::timestamptz) as "expiredAds"`),
      this.db.execute(sql`select
        (select count(*)::int from ads where moderation_status = 'pending') as "pendingAds",
        (select count(*)::int from moderation_reports where status in ('open', 'escalated')) as "openReports",
        (select count(distinct target_id)::int from moderation_reports where target_type = 'message' and status in ('open', 'escalated')) as "flaggedMessages",
        (select count(*)::int from users where date_created >= (now() - interval '24 hours') at time zone current_setting('TimeZone')) as "newUsers"`),
      this.db.execute(sql`with buckets as (
        select generate_series(${since}::timestamptz, ${now.toISOString()}::timestamptz, ${bucket === 'hour' ? '1 hour' : '1 day'}::interval) as t
      ) select t as "at",
        (select count(*)::int from ads where date_created at time zone current_setting('TimeZone') >= t and date_created at time zone current_setting('TimeZone') < t + ${bucket === 'hour' ? '1 hour' : '1 day'}::interval) as "ads",
        (select count(*)::int from users where date_created at time zone current_setting('TimeZone') >= t and date_created at time zone current_setting('TimeZone') < t + ${bucket === 'hour' ? '1 hour' : '1 day'}::interval) as "users",
        (select count(*)::int from messages where created_at >= t and created_at < t + ${bucket === 'hour' ? '1 hour' : '1 day'}::interval) as "messages"
        from buckets order by t`),
      this.activity(),
      this.db.select({ id: users.id, username: users.username, createdAt: sql<Date>`${users.dateCreated} at time zone current_setting('TimeZone')`.mapWith(actions.createdAt) }).from(users)
        .where(gte(users.dateCreated, sql`(now() - interval '24 hours') at time zone current_setting('TimeZone')`)).orderBy(desc(users.dateCreated)).limit(20),
    ]);
    return { period, since, timezone: 'UTC', stats: stats.rows[0], queues: queues.rows[0], chart: chart.rows, activity, newUsers };
  }

  async listAds(query: Record<string, string | undefined>) {
    object(query, ['search', 'status', 'brand', 'seller', 'from', 'to', 'reported', 'page']);
    if (Object.values(query).some(value => typeof value !== 'string' || value.length > 200)) throw new BadRequestException('Neispravni filtri.');
    const page = query.page === undefined ? 1 : positiveId(query.page);
    if (page > 100000) throw new BadRequestException('Neispravna stranica.');
    const conditions: SQL[] = [];
    if (query.search) {
      if (query.search.length > 200) throw new BadRequestException('Preduga pretraga.');
      const term = `%${query.search.replace(/[\\%_]/g, '\\$&')}%`;
      conditions.push(or(ilike(ads.title, term), ilike(ads.vin, term), ilike(users.username, term), sql`${ads.id}::text = ${query.search}`)!);
    }
    if (query.brand) conditions.push(eq(ads.brand, query.brand));
    if (query.seller) conditions.push(eq(ads.userId, positiveId(query.seller)));
    if (query.from) conditions.push(gte(ads.dateCreated, dateInput(query.from)));
    if (query.to) conditions.push(lt(ads.dateCreated, dateInput(query.to, true)));
    if (query.from && query.to && query.from > query.to) throw new BadRequestException('Neispravan raspon datuma.');
    if (query.status) {
      if (['pending', 'rejected', 'changes', 'removed'].includes(query.status)) conditions.push(eq(ads.moderationStatus, query.status as 'pending' | 'rejected' | 'changes' | 'removed'));
      else if (query.status === 'expired') conditions.push(and(eq(ads.status, 'active'), sql`${ads.expiresAt} <= now()`)!);
      else if (query.status === 'active') conditions.push(activeAdsCondition()!);
      else if (query.status === 'sold' || query.status === 'hidden') conditions.push(eq(ads.status, query.status));
      else throw new BadRequestException('Neispravan status.');
    }
    if (query.reported === 'true') conditions.push(sql`exists (select 1 from ${reports} where ${reports.targetType} = 'ad' and ${reports.targetId} = ${ads.id} and ${reports.status} = 'open')`);
    else if (query.reported && query.reported !== 'false') throw new BadRequestException('Neispravan filtar prijava.');
    const [items, [count], brands, sellers] = await Promise.all([
      this.db.select({ ad: adProjection, seller: users.username }).from(ads).leftJoin(users, eq(users.id, ads.userId)).where(and(...conditions))
        .orderBy(desc(ads.pinned), desc(ads.dateCreated), desc(ads.id)).limit(25).offset((page - 1) * 25),
      this.db.select({ total: sql<number>`count(*)::int` }).from(ads).leftJoin(users, eq(users.id, ads.userId)).where(and(...conditions)),
      this.db.selectDistinct({ name: ads.brand }).from(ads).orderBy(asc(ads.brand)),
      this.db.selectDistinct({ id: users.id, name: users.username }).from(users).innerJoin(ads, eq(ads.userId, users.id)).orderBy(asc(users.username)),
    ]);
    return { items: items.map(({ ad, seller }) => ({ ...ad, seller, effectiveStatus: this.status(ad) })), total: count.total, page, pageSize: 25, brands: brands.flatMap(row => row.name ? [row.name] : []), sellers };
  }

  private status(ad: typeof ads.$inferSelect) {
    return ad.moderationStatus && ad.moderationStatus !== 'approved' ? ad.moderationStatus : effectiveAdStatus(ad);
  }

  async detail(id: number) {
    const [row] = await this.db.select({ ad: adProjection, seller: users.username }).from(ads).leftJoin(users, eq(users.id, ads.userId)).where(eq(ads.id, id));
    if (!row) throw new NotFoundException('Oglas nije pronađen.');
    const [photos, otherAds, history, decisions, duplicates] = await Promise.all([
      this.db.select().from(adImages).where(eq(adImages.adId, id)).orderBy(asc(adImages.id)),
      this.db.select({ id: ads.id, title: ads.title, status: ads.status }).from(ads).where(and(eq(ads.userId, row.ad.userId), ne(ads.id, id))).orderBy(desc(ads.id)).limit(50),
      this.db.select().from(reports).where(and(eq(reports.targetType, 'ad'), eq(reports.targetId, id))).orderBy(desc(reports.id)).limit(100),
      this.db.select().from(actions).where(eq(actions.adId, id)).orderBy(desc(actions.id)).limit(100),
      this.duplicates(id),
    ]);
    return { ...row.ad, seller: row.seller, effectiveStatus: this.status(row.ad), photos, otherAds, reports: history, decisions, duplicates };
  }

  async moderate(actorId: number, value: unknown) {
    const { ids, decision, reason } = moderationInput(value);
    await this.db.transaction(async tx => {
      const before = await tx.select().from(ads).where(inArray(ads.id, ids)).orderBy(asc(ads.id)).for('update');
      if (before.length !== ids.length) throw new NotFoundException('Jedan ili više oglasa više ne postoji. Nema spremljenih promjena.');
      for (const ad of before) {
        const approved = decision === 'approve' || decision === 'restore';
        const moderationStatus = approved ? 'approved' : decision === 'reject' ? 'rejected' : decision === 'remove' ? 'removed' : decision;
        const [after] = await tx.update(ads).set({
          status: approved ? 'active' : 'hidden', moderationStatus, moderationReason: reason, dateLastUpdated: new Date(),
          ...(approved ? { soldAt: null } : {}),
          ...(approved && ad.expiresAt <= new Date() ? { expiresAt: sql`now() + interval '3 days'` } : {}),
        }).where(eq(ads.id, ad.id)).returning();
        await this.log(tx, actorId, decision, ad.id, reason, ad, after);
      }
    });
    return { updated: ids.length };
  }

  async edit(actorId: number, id: number, value: unknown) {
    const body = object(value, ['fields', 'reason', 'version']);
    const reason = note(body.reason);
    const raw = object(body.fields, ['title', 'description', 'brand', 'model', 'category', 'subcategory', 'price', 'year', 'kilometrage', 'enginePower', 'fuel', 'condition', 'county', 'sellerType', 'buyOrLease', 'gearType', 'driveType', 'gearCount', 'fuelConsumption', 'warranty', 'color', 'doorNumber', 'drivingLicence', 'weight', 'payload', 'volume', 'vin', 'featured', 'pinned']);
    const { vin, featured, pinned, ...adFields } = raw;
    const fields = validateInput(adFields, 'UpdateAdDto') as Record<string, string | number | null>;
    for (const key of ['title', 'category', 'subcategory', 'brand', 'model']) {
      if (fields[key] !== undefined && !String(fields[key]).trim()) throw new BadRequestException('Obavezna polja ne mogu biti prazna.');
    }
    if (vin !== undefined && vin !== null && (typeof vin !== 'string' || (vin !== '' && !/^[A-HJ-NPR-Z0-9]{17}$/i.test(vin)))) throw new BadRequestException('VIN mora imati 17 valjanih znakova.');
    for (const value of [featured, pinned]) if (value !== undefined && typeof value !== 'boolean') throw new BadRequestException('Neispravna oznaka.');
    if (!Object.keys(raw).length) throw new BadRequestException('Nema promjena.');
    await this.db.transaction(async tx => {
      const before = await this.lock(tx, id, body.version);
      const [after] = await tx.update(ads).set({ ...fields,
        ...(fields.price === undefined ? {} : { price: String(fields.price) }),
        ...(fields.fuelConsumption === undefined ? {} : { fuelConsumption: fields.fuelConsumption === null ? null : String(fields.fuelConsumption) }),
        ...(vin === undefined ? {} : { vin: typeof vin === 'string' && vin ? vin.toUpperCase() : null }),
        ...(featured === undefined ? {} : { featured: featured as boolean }), ...(pinned === undefined ? {} : { pinned: pinned as boolean }), dateLastUpdated: new Date(),
      }).where(eq(ads.id, id)).returning();
      if (fields.price !== undefined && before.price !== null && Number(fields.price) < Number(before.price)) {
        const subscribers = await tx.select({ userId: schema.savedAds.userId }).from(schema.savedAds).where(and(eq(schema.savedAds.adId, id), ne(schema.savedAds.userId, before.userId)));
        if (subscribers.length) await tx.insert(schema.priceDropNotifications).values(subscribers.map(({ userId }) => ({ userId, adId: id, oldPrice: before.price!, newPrice: String(fields.price) })));
      }
      await this.log(tx, actorId, 'edit', id, reason, before, after);
    });
    return this.detail(id);
  }

  async removePhoto(actorId: number, id: number, photoId: number, value: unknown) {
    const body = object(value, ['reason', 'version']);
    const reason = note(body.reason);
    await this.db.transaction(async tx => {
      const ad = await this.lock(tx, id, body.version);
      const before = await tx.select().from(adImages).where(eq(adImages.adId, id)).orderBy(asc(adImages.id));
      if (!before.some(photo => photo.id === photoId)) throw new NotFoundException('Slika ne pripada oglasu.');
      await tx.delete(adImages).where(and(eq(adImages.id, photoId), eq(adImages.adId, id)));
      const after = before.filter(photo => photo.id !== photoId);
      await tx.update(ads).set({ previewImg: ad.previewImg === before.find(photo => photo.id === photoId)!.imageUrl ? after[0]?.imageUrl ?? null : ad.previewImg, dateLastUpdated: new Date() }).where(eq(ads.id, id));
      await this.log(tx, actorId, 'remove_photo', id, reason, { photos: before }, { photos: after });
    });
    return this.detail(id);
  }

  private async lock(tx: Transaction, id: number, version: unknown) {
    const [ad] = await tx.select().from(ads).where(eq(ads.id, id)).for('update');
    if (!ad) throw new NotFoundException('Oglas nije pronađen.');
    if (typeof version !== 'string' || !ad.dateLastUpdated || new Date(version).getTime() !== ad.dateLastUpdated.getTime()) throw new BadRequestException('Oglas je promijenjen. Osvježite detalje i pokušajte ponovno.');
    return ad;
  }

  private log(tx: Transaction, actorId: number, action: string, adId: number | null, reason: string, before: unknown, after: unknown) {
    return tx.insert(actions).values({ actorId, action, adId, reason, before, after });
  }

  async activity() {
    return this.db.select({ id: actions.id, actorId: actions.actorId, actor: users.username, action: actions.action, adId: actions.adId, targetUserId: actions.targetUserId, reason: actions.reason, before: actions.before, after: actions.after, createdAt: actions.createdAt }).from(actions).leftJoin(users, eq(users.id, actions.actorId)).orderBy(desc(actions.id)).limit(100);
  }

  async listReports(type?: string, status = 'open') {
    if (type && !['ad', 'user', 'message'].includes(type)) throw new BadRequestException('Neispravna vrsta prijave.');
    if (!['open', 'pending', 'escalated', 'resolved', 'dismissed', 'all'].includes(status)) throw new BadRequestException('Neispravan status prijave.');
    return this.db.select().from(reports).where(and(type ? eq(reports.targetType, type as 'ad' | 'user' | 'message') : undefined, status === 'all' ? undefined : status === 'pending' ? inArray(reports.status, ['open', 'escalated']) : eq(reports.status, status as 'open' | 'escalated' | 'resolved' | 'dismissed'))).orderBy(desc(reports.id)).limit(100);
  }

  async resolveReport(actorId: number, id: number, value: unknown) {
    const body = object(value, ['status', 'reason', 'violationConfirmed', 'hideAd']);
    if (!['resolved', 'dismissed', 'escalated'].includes(String(body.status))) throw new BadRequestException('Neispravan status.');
    if (body.violationConfirmed !== undefined && typeof body.violationConfirmed !== 'boolean' || body.hideAd !== undefined && typeof body.hideAd !== 'boolean') throw new BadRequestException('Neispravna odluka.');
    if (body.violationConfirmed && body.status !== 'resolved') throw new BadRequestException('Kršenje se potvrđuje pri rješavanju prijave.');
    const reason = note(body.reason);
    await this.db.transaction(async tx => {
      const [before] = await tx.select().from(reports).where(eq(reports.id, id)).for('update');
      if (!before || !['open', 'escalated'].includes(before.status)) throw new BadRequestException('Prijava nije otvorena.');
      const [actor] = await tx.select({ role: users.role }).from(users).where(eq(users.id, actorId));
      if (before.status === 'escalated' && actor?.role !== 'admin') throw new BadRequestException('Eskaliranu prijavu rješava administrator.');
      const [after] = await tx.update(reports).set({ status: body.status as 'resolved' | 'dismissed' | 'escalated', resolutionNote: reason, violationConfirmed: body.violationConfirmed === true, resolvedAt: body.status === 'escalated' ? null : new Date() }).where(eq(reports.id, id)).returning();
      const [ad] = before.targetType === 'ad' ? await tx.select({ id: ads.id }).from(ads).where(eq(ads.id, before.targetId)) : [];
      if (body.hideAd) {
        if (!ad || body.status !== 'resolved') throw new BadRequestException('Sakriti se može samo oglas pri rješavanju prijave.');
        const [adBefore] = await tx.select().from(ads).where(eq(ads.id, ad.id)).for('update');
        const [adAfter] = await tx.update(ads).set({ status: 'hidden', moderationStatus: 'removed', moderationReason: reason, dateLastUpdated: new Date() }).where(eq(ads.id, ad.id)).returning();
        await this.log(tx, actorId, 'remove', ad.id, reason, adBefore, adAfter);
      }
      await tx.insert(actions).values({ actorId, adId: ad?.id ?? null, targetUserId: before.subjectUserId, action: body.status === 'escalated' ? 'escalate_report' : 'resolve_report', reason, before, after });
    });
    return { success: true };
  }

  async submitReport(reporterId: number, value: unknown) {
    const body = object(value, ['targetType', 'targetId', 'reason']);
    const targetId = positiveId(body.targetId);
    const reason = note(body.reason);
    let subjectUserId: number;
    if (!['ad', 'user', 'message'].includes(String(body.targetType))) throw new BadRequestException('Neispravna vrsta prijave.');
    if (body.targetType === 'ad') {
      const [ad] = await this.db.select({ id: ads.id, userId: ads.userId }).from(ads).where(and(eq(ads.id, targetId), ne(ads.status, 'hidden')));
      if (!ad) throw new NotFoundException('Oglas nije pronađen.');
      subjectUserId = ad.userId;
    } else if (body.targetType === 'user') {
      const [user] = await this.db.select({ id: users.id }).from(users).where(eq(users.id, targetId));
      if (!user) throw new NotFoundException('Korisnik nije pronađen.');
      subjectUserId = user.id;
    } else {
      const [message] = await this.db.select({ id: schema.messages.id, senderId: schema.messages.senderId }).from(schema.messages)
        .innerJoin(schema.conversations, eq(schema.conversations.id, schema.messages.conversationId))
        .where(and(eq(schema.messages.id, targetId), or(eq(schema.conversations.userAid, reporterId), eq(schema.conversations.userBid, reporterId))));
      if (!message) throw new NotFoundException('Poruka nije pronađena.');
      subjectUserId = message.senderId;
    }
    const [report] = await this.db.insert(reports).values({ targetType: body.targetType as 'ad' | 'user' | 'message', targetId, reporterId, subjectUserId, reason }).returning({ id: reports.id });
    return report;
  }

  async duplicates(id: number) {
    const [ad] = await this.db.select({ vin: ads.vin }).from(ads).where(eq(ads.id, id));
    if (!ad) throw new NotFoundException('Oglas nije pronađen.');
    const result = await this.db.execute(sql`select distinct a.id, a.title,
      (a.vin is not null and a.vin = ${ad.vin}) as "sameVin",
      exists (select 1 from ad_images x join ad_images y on (x.image_url = y.image_url or (x.sha256 is not null and x.sha256 = y.sha256)) where x.ad_id = ${id} and y.ad_id = a.id) as "samePhoto"
      from ads a where a.id <> ${id} and
      ((${ad.vin}::text is not null and a.vin = ${ad.vin}) or exists (select 1 from ad_images x join ad_images y on (x.image_url = y.image_url or (x.sha256 is not null and x.sha256 = y.sha256)) where x.ad_id = ${id} and y.ad_id = a.id)) order by a.id desc limit 100`);
    const [coverage] = await this.db.select({ unindexed: sql<number>`count(*)::int` }).from(adImages).where(isNull(adImages.sha256));
    return { matches: result.rows, unindexedPhotos: coverage.unindexed };
  }

  async indexPhotos(after: number) {
    const photos = await this.db.select().from(adImages).where(and(isNull(adImages.sha256), sql`${adImages.id} > ${after}`)).orderBy(asc(adImages.id)).limit(100);
    let indexed = 0;
    for (const photo of photos) {
      const digest = await imageDigest(photo.imageUrl);
      if (digest) {
        await this.db.update(adImages).set({ sha256: digest }).where(eq(adImages.id, photo.id));
        indexed++;
      }
    }
    return { scanned: photos.length, indexed, next: photos.at(-1)?.id ?? after, done: photos.length < 100 };
  }
}
