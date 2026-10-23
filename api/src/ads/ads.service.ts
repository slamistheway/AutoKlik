import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {and, asc, desc, eq, gte, ilike, inArray, isNull, lte, ne, notInArray, or, sql, type SQL,} from 'drizzle-orm';
// import { gt } from 'drizzle-orm';
// import { buildRecommendationPreferences } from './recommendation-preferences';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { CreateAdDto, UpdateAdDto } from '../dtos/ad.dtos';
import * as schema from '../db/schema';
import { activeAdsCondition, effectiveAdStatus, publicSellerCondition } from './ad-status';
import { imageDigest } from '../admin/image-digest';
import { parseSearch, searchConditions, searchOrder } from './search-filters';

const { ads, adImages, adViews, savedAds, users, priceDropNotifications } = schema;
type Ad = typeof ads.$inferSelect;
type AdWithRelations = {
  ad: Ad;
  sellerUsername: string | null;
  imageUrl: string | null;
  viewCount?: number;
};

@Injectable()
export class AdsService {
  private readonly logger = new Logger(AdsService.name);

  constructor(
    @Inject('DRIZZLE_DB') private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  private normalizeImages(images: string[]): string[] {
    return images
      .map((image) => image.trim())
      .filter((image) => image.length > 0);
  }

  private mapAdForApi(
    ad: Ad,
    sellerUsername: string | null,
    images: string[] = [],
    viewCount = 0,
  ) {
    return {
      id: ad.id,
      vin: ad.vin,
      moderation_status: ad.moderationStatus,
      moderation_reason: ad.moderationReason,
      view_count: viewCount,
      status: effectiveAdStatus(ad),
      expires_at: ad.expiresAt,
      user_id: ad.userId,
      seller_username: sellerUsername ?? '',
      category: ad.category,
      subcategory: ad.subcategory,
      brand: ad.brand,
      model: ad.model,
      title: ad.title,
      description: ad.description,
      price: ad.price,
      kilometrage: ad.kilometrage,
      engine_power: ad.enginePower,
      engine_size: ad.engineSize,
      fuel: ad.fuel,
      condition: ad.condition,
      county: ad.county,
      seller_type: ad.sellerType,
      buy_or_lease: ad.buyOrLease,
      body_type: ad.bodyType,
      air_conditioning: ad.airConditioning,
      airbags: ad.airbags,
      car_radio: ad.carRadio,
      seat_count: ad.seatCount,
      tire_width: ad.tireWidth,
      tire_height: ad.tireHeight,
      tire_diameter: ad.tireDiameter,
      emission_class: ad.emissionClass,
      drive_type: ad.driveType,
      gear_count: ad.gearCount,
      fuel_consumption: ad.fuelConsumption,
      warranty: ad.warranty,
      gear_type: ad.gearType,
      color: ad.color,
      door_number: ad.doorNumber,
      driving_licence: ad.drivingLicence,
      weight: ad.weight,
      payload: ad.payload,
      volume: ad.volume,
      preview_img: ad.previewImg ?? images[0] ?? null,
      year: ad.year,
      images,
      created_at: ad.dateCreated,
      updated_at: ad.dateLastUpdated,
    };
  }

  private mapJoinedAds(rows: AdWithRelations[]) {
    const grouped = new Map<
      number,
      { ad: Ad; sellerUsername: string | null; images: string[]; viewCount: number }
    >();

    for (const row of rows) {
      let groupedAd = grouped.get(row.ad.id);
      if (!groupedAd) {
        groupedAd = {
          ad: row.ad,
          sellerUsername: row.sellerUsername,
          images: [],
          viewCount: Number(row.viewCount ?? 0),
        };
        grouped.set(row.ad.id, groupedAd);
      }
      if (row.imageUrl) groupedAd.images.push(row.imageUrl);
    }

    return [...grouped.values()].map(({ ad, sellerUsername, images, viewCount }) =>
      this.mapAdForApi(ad, sellerUsername, images, viewCount),
    );
  }

  private normalizeCsvValues(value?: string): string[] {
    if (!value) return [];

    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private toValidYear(value?: string): number | null {
    if (!value) return null;

    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : null;
  }

  private buildFilterConditions(filters: {
    category?: string;
    subcategory?: string;
    fuel?: string;
    brands?: string;
    models?: string;
    yearMin?: string;
    yearMax?: string;
    search?: string;
  }): SQL[] {
    const conditions: SQL[] = [];
    const category = filters.category?.trim();
    const subcategory = filters.subcategory?.trim();
    const brands = this.normalizeCsvValues(filters.brands);
    const models = this.normalizeCsvValues(filters.models);
    const yearMin = this.toValidYear(filters.yearMin);
    const yearMax = this.toValidYear(filters.yearMax);
    const search = filters.search?.trim();

    if (category) conditions.push(eq(ads.category, category));
    if (filters.fuel?.trim()) conditions.push(eq(ads.fuel, filters.fuel.trim()));
    if (subcategory) conditions.push(eq(ads.subcategory, subcategory));
    if (brands.length > 0) conditions.push(inArray(ads.brand, brands));
    if (models.length > 0) conditions.push(inArray(ads.model, models));
    if (yearMin !== null) conditions.push(gte(ads.year, yearMin));
    if (yearMax !== null) conditions.push(lte(ads.year, yearMax));
    if (search) {
      const token = `%${search}%`;
      const searchCondition = or(
        ilike(ads.title, token),
        ilike(ads.description, token),
        ilike(ads.brand, token),
        ilike(ads.model, token),
      );
      if (searchCondition) conditions.push(searchCondition);
    }

    return conditions;
  }

  private getAdsWithRelations(where?: SQL) {
    return this.db
      .select({
        ad: ads,
        sellerUsername: users.username,
        imageUrl: adImages.imageUrl,
        viewCount: sql<number>`(select count(*)::integer from ${adViews} where ${adViews.adId} = ${ads.id})`,
      })
      .from(ads)
      .leftJoin(users, eq(users.id, ads.userId))
      .leftJoin(adImages, eq(adImages.adId, ads.id))
      .where(where)
      .orderBy(desc(ads.dateCreated), desc(ads.id), asc(adImages.createdAt));
  }

  /*-------------------------------------------CRUD---------------------------------------------*/
  async deleteAd(adId: number, userId: number): Promise<{ statusCode: string; message: string }> {
    this.logger.log("Deleting ad with id " + adId);

    if (!Number.isFinite(adId) || adId <= 0 || !Number.isFinite(userId) || userId <= 0) {
      throw new BadRequestException('Invalid ads ID or user ID.');
    }

    const [deletedAd] = await this.db
      .delete(ads)
      .where(and(eq(ads.id, adId), eq(ads.userId, userId)))
      .returning({ id: ads.id });

    if (!deletedAd) {
      throw new NotFoundException(
        'Ad not found or you do not have permission to delete it.',
      );
    }

    this.logger.log(`Ad with ID ${adId} deleted by user with ID ${userId}.`);

    return {
      statusCode: "200",
      message: "Oglas je uspješno izbrisan."
    }
  }



  async create(createAdDto: CreateAdDto, imageUrls: string[] = [], onPersisted?: () => void) {
    const {
      user_id,
      category,
      subcategory,
      brand,
      model,
      year,
      title,
      description,
    } = createAdDto;
    const normalizedImages = this.normalizeImages(imageUrls);

    if (!user_id || !category || !subcategory || !brand || !model) {
      throw new BadRequestException('Required ads fields are missing.');
    }

    const [createdAd] = await this.db.transaction(async (tx) => {
      const [ad] = await tx
        .insert(ads)
        .values({
          userId: user_id,
          vin: createAdDto.vin?.toUpperCase() || null,

          category: category,
          subcategory: subcategory,
          brand: brand,
          model: model,
          price: String(createAdDto.price),
          kilometrage: createAdDto.kilometrage,
          enginePower: createAdDto.enginePower ?? null,
          engineSize: createAdDto.engineSize ?? null,
          year: year ?? null,
          fuel: createAdDto.fuel || null,
          condition: createAdDto.condition || null,
          county: createAdDto.county || null,
          sellerType: createAdDto.sellerType || null,
          buyOrLease: createAdDto.buyOrLease || null,
          bodyType: createAdDto.bodyType,
          airConditioning: createAdDto.airConditioning,
          airbags: createAdDto.airbags,
          carRadio: createAdDto.carRadio,
          seatCount: createAdDto.seatCount,
          tireWidth: createAdDto.tireWidth,
          tireHeight: createAdDto.tireHeight,
          tireDiameter: createAdDto.tireDiameter,
          emissionClass: createAdDto.emissionClass,
          driveType: createAdDto.driveType,
          gearCount: createAdDto.gearCount,
          fuelConsumption: createAdDto.fuelConsumption == null ? null : String(createAdDto.fuelConsumption),
          warranty: createAdDto.warranty,
          gearType: createAdDto.gearType,
          color: createAdDto.color,
          doorNumber: createAdDto.doorNumber,
          drivingLicence: createAdDto.drivingLicence || '',
          weight: createAdDto.weight,
          payload: createAdDto.payload,
          volume: createAdDto.volume,

          title: title ?? null,
          description: description ?? null,
          previewImg: normalizedImages[0] ?? null,

        })
        .returning();

      if (normalizedImages.length > 0) {
        await tx.insert(adImages).values(
          await Promise.all(normalizedImages.map(async (imageUrl) => ({
            adId: ad.id,
            imageUrl,
            sha256: await imageDigest(imageUrl),
          }))),
        );
        this.logger.warn(`Inserted ${normalizedImages.length} images for ad with ID ${ad.id}.`);
      }else {
        this.logger.warn(`No images found for ad with ID ${ad.id}.`);
      }

      return [ad];
    });

    onPersisted?.();
    const adRows = await this.getAdsWithRelations(eq(ads.id, createdAd.id));
    const [mappedAd] = this.mapJoinedAds(adRows);

    return {
      message: 'Ad created successfully.',
      ad: {
        ...(mappedAd ?? { id: createdAd.id, user_id }),
        images: normalizedImages,
      },
    };
  }

  /*-------------------------------------------SELECTING---------------------------------------------*/
  async search(query: unknown, userId?: number) {
    const filters = parseSearch(query);
    const page = Number(filters.page ?? 1);
    const pageSize = Number(filters.pageSize ?? 24);
    const visible = and(activeAdsCondition(), ...searchConditions(filters));
    const [count] = await this.db.select({total: sql<number>`count(*)::int`}).from(ads).where(visible);
    const rows = await this.db.select({id: ads.id}).from(ads).where(visible)
      .orderBy(...searchOrder(filters.sort)).limit(pageSize).offset((page - 1) * pageSize);
    const ids = rows.map(row => row.id);
    const mapped = ids.length ? this.mapJoinedAds(await this.getAdsWithRelations(and(visible, inArray(ads.id, ids)))) : [];
    const saved = userId && ids.length ? await this.db.select({id: savedAds.adId}).from(savedAds).where(and(eq(savedAds.userId, userId), inArray(savedAds.adId, ids))) : [];
    const savedIds = new Set(saved.map(row => row.id));
    const byId = new Map(mapped.map(ad => [ad.id, ad]));
    return {items: ids.flatMap(id => { const ad = byId.get(id); return ad ? [{...ad, is_saved: savedIds.has(id)}] : []; }), total: count.total, page, pageSize, totalPages: Math.ceil(count.total / pageSize)};
  }

  async sitemap(query: Record<string, string>) {
    if (Object.keys(query).some(key => !['kind', 'page'].includes(key)) || Object.values(query).some(value => typeof value !== 'string')) throw new BadRequestException('Neispravan upit.');
    const kind = query.kind ?? 'counts';
    if (!['counts', 'ads', 'sellers'].includes(kind)) throw new BadRequestException('Neispravna vrsta karte.');
    const page = query.page === undefined ? 1 : Number(query.page);
    if (query.page !== undefined && !/^[1-9]\d*$/.test(query.page) || !Number.isSafeInteger(page) || page < 1 || page > 100000) throw new BadRequestException('Neispravna stranica.');
    const pageSize = 1000;
    if (kind === 'counts') {
      const [counts] = await this.db.select({ ads: sql<number>`count(*)::int`, sellers: sql<number>`count(distinct ${ads.userId})::int` }).from(ads).where(activeAdsCondition());
      return { ...counts, pageSize };
    }
    if (kind === 'sellers') {
      const items = await this.db.selectDistinct({ id: ads.userId }).from(ads).where(activeAdsCondition()).orderBy(asc(ads.userId)).limit(pageSize).offset((page - 1) * pageSize);
      return { items, pageSize };
    }
    const items = await this.db.select({ id: ads.id, title: ads.title, lastModified: sql<string | null>`to_char(${ads.dateLastUpdated}, 'YYYY-MM-DD')` }).from(ads)
      .where(activeAdsCondition()).orderBy(asc(ads.id)).limit(pageSize).offset((page - 1) * pageSize);
    return { items, pageSize };
  }

  async findAllAds(
    userId?: number,
    filters: {
      category?: string;
      subcategory?: string;
      fuel?: string;
      brands?: string;
      models?: string;
      yearMin?: string;
      yearMax?: string;
      search?: string;
    } = {},
  ) {
    const normalizedUserId = Number(userId);
    this.logger.debug('normalizedUserId za homapage:' + normalizedUserId);

    const hasUserId = Number.isFinite(normalizedUserId) && normalizedUserId > 0;
    const MAX_RECENT_ADS = 30;
    const filterConditions = [activeAdsCondition(), ...this.buildFilterConditions(filters)];
    const idRows = await this.db
      .select({ id: ads.id })
      .from(ads)
      .where(and(...filterConditions))
      .orderBy(desc(ads.pinned), desc(ads.dateCreated), desc(ads.id))
      .limit(MAX_RECENT_ADS);
    const adIds = idRows.map((row) => row.id);

    if (adIds.length === 0) return [];

    const adRows = await this.getAdsWithRelations(inArray(ads.id, adIds));
    const mappedAds = this.mapJoinedAds(adRows);
    const orderedAds = new Map(mappedAds.map((ad) => [ad.id, ad]));

    let savedAdIds = new Set<number>();
    if (hasUserId) {
      const savedRows = await this.db
        .select({ adId: savedAds.adId })
        .from(savedAds)
        .where(
          and(
            eq(savedAds.userId, normalizedUserId),
            inArray(savedAds.adId, adIds),
          ),
        );

      savedAdIds = new Set(savedRows.map((row) => row.adId));
    }

    return adIds
      .map((id) => orderedAds.get(id))
      .filter((ad): ad is NonNullable<typeof ad> => Boolean(ad))
      .map((ad) => ({
        ...ad,
        is_saved: hasUserId ? savedAdIds.has(ad.id) : false,
      }));
  }

  async findRecommendedAds(userId?: number) {
    const authenticated = Number.isSafeInteger(userId) && Boolean(userId && userId > 0);
    // Preference ranking is temporarily disabled; recommendations use random ads.
    /*
    const saved = authenticated ? await this.db.select({ ad: ads }).from(savedAds)
      .innerJoin(ads, eq(ads.id, savedAds.adId))
      .where(eq(savedAds.userId, userId!)).orderBy(desc(savedAds.dateSaved)).limit(100) : [];
    const preferences = buildRecommendationPreferences(saved.map(row => row.ad));
    const terms = preferences.signals.map(({ field, value, weight }) =>
      sql<number>`case when lower(trim(${ads[field]})) = ${value} then ${weight}::float8 else 0 end`);
    if (preferences.price !== null) {
      terms.push(sql<number>`case when ${ads.price} > 0 then greatest(0, 1 - abs(${ads.price}::float8 - ${preferences.price}::float8) / ${preferences.price}::float8) * 2 else 0 end`);
    }
    const score = terms.length ? sql<number>`${sql.join(terms, sql` + `)}` : sql<number>`0::float8`;
    */
    const eligibility: SQL[] = [activeAdsCondition()!];
    if (authenticated) {
      const savedIds = this.db.select({ id: savedAds.adId }).from(savedAds).where(eq(savedAds.userId, userId!));
      eligibility.push(ne(ads.userId, userId!), notInArray(ads.id, savedIds));
    }
    /*
    const ids = terms.length ? await this.db.select({ id: ads.id }).from(ads)
      .where(and(...eligibility, gt(score, 0)))
      .orderBy(desc(score), desc(ads.dateCreated), desc(ads.id)).limit(30) : [];
    */
    const ids: { id: number }[] = [];
    if (ids.length < 30) {
      const random = await this.db.select({ id: ads.id }).from(ads)
        .where(and(...eligibility, ids.length ? notInArray(ads.id, ids.map(row => row.id)) : undefined))
        .orderBy(sql`random()`).limit(30 - ids.length);
      ids.push(...random);
    }
    if (!ids.length) return [];
    const rows = await this.getAdsWithRelations(inArray(ads.id, ids.map(row => row.id)));
    const mapped = new Map(this.mapJoinedAds(rows).map(ad => [ad.id, ad]));
    return ids.flatMap(({ id }) => {
      const ad = mapped.get(id);
      return ad ? [{ ...ad, is_saved: false }] : [];
    });
  }

  async fetchSavedAds(userId: number | string) {
    const normalizedUserId = Number(userId);
    this.logger.debug(
      'normalizedUserId za my saved ads apge:' + normalizedUserId,
    );

    if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) {
      throw new BadRequestException('User id is required.');
    }

    const rows = await this.db
      .select({
        savedAt: savedAds.dateSaved,
        ad: ads,
        imageUrl: adImages.imageUrl,
      })
      .from(savedAds)
      .innerJoin(ads, eq(ads.id, savedAds.adId))
      .leftJoin(adImages, eq(adImages.adId, ads.id))
      .where(and(eq(savedAds.userId, normalizedUserId), ne(ads.status, 'hidden'), publicSellerCondition()))
      .orderBy(desc(savedAds.dateSaved), asc(adImages.createdAt));

    const grouped = new Map<
      number,
      { ad: Ad; savedAt: Date | null; images: string[] }
    >();
    for (const row of rows) {
      let savedAd = grouped.get(row.ad.id);
      if (!savedAd) {
        savedAd = { ad: row.ad, savedAt: row.savedAt, images: [] };
        grouped.set(row.ad.id, savedAd);
      }
      if (row.imageUrl) savedAd.images.push(row.imageUrl);
    }

    return [...grouped.values()].map(({ ad, savedAt, images }) => ({
      ad_id: ad.id,
      status: effectiveAdStatus(ad),
      expires_at: ad.expiresAt,
      user_id: ad.userId,
      category: ad.category,
      subcategory: ad.subcategory,
      brand: ad.brand,
      model: ad.model,
      title: ad.title,
      description: ad.description,
      preview_img: ad.previewImg ?? images[0] ?? null,
      year: ad.year,
      images,
      created_at: ad.dateCreated,
      updated_at: ad.dateLastUpdated,
      saved_at: savedAt,
    }));
  }



  async findFeaturedAds(userId?: number,) {
    const normalizedUserId = Number(userId);
    const hasUserId = Number.isFinite(normalizedUserId) && normalizedUserId > 0;
    const MAX_RECENT_ADS = 20;

    const idRows = await this.db
        .select({ id: ads.id })
        .from(ads)
        .where(and(eq(ads.featured, true), activeAdsCondition()))
        .orderBy(desc(ads.pinned), desc(ads.dateCreated), desc(ads.id))
        .limit(MAX_RECENT_ADS);

    const adIds = idRows.map((row) => row.id);

    if (adIds.length === 0) return [];

    const adRows = await this.getAdsWithRelations(inArray(ads.id, adIds));
    const mappedAds = this.mapJoinedAds(adRows);
    const orderedAds = new Map(mappedAds.map((ad) => [ad.id, ad]));

    let savedAdIds = new Set<number>();
    if (hasUserId) {
      const savedRows = await this.db
          .select({ adId: savedAds.adId })
          .from(savedAds)
          .where(
              and(
                  eq(savedAds.userId, normalizedUserId),
                  inArray(savedAds.adId, adIds),
              ),
          );

      savedAdIds = new Set(savedRows.map((row) => row.adId));
    }

    return adIds
        .map((id) => orderedAds.get(id))
        .filter((ad): ad is NonNullable<typeof ad> => Boolean(ad))
        .map((ad) => ({
          ...ad,
          is_saved: hasUserId ? savedAdIds.has(ad.id) : false,
        }));
  }







  async fetchAllAdsByUserId(userId: number | string) {
    const normalizedUserId = Number(userId);

    if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) {
      throw new BadRequestException('User id is required.');
    }

    const rows = await this.getAdsWithRelations(
      eq(ads.userId, normalizedUserId),
    );
    return this.mapJoinedAds(rows);
  }

  async findOne(id: number, userId?: number) {
    const rows = await this.getAdsWithRelations(and(eq(ads.id, id), or(and(ne(ads.status, 'hidden'), publicSellerCondition()), userId ? eq(ads.userId, userId) : undefined)));
    const [ad] = this.mapJoinedAds(rows);

    if (!ad) {
      throw new NotFoundException('Ad not found.');
    }

    return ad;
  }

  async recordView(id: number, viewerId: number) {
    if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(viewerId) || viewerId <= 0) {
      throw new BadRequestException('Neispravan oglas ili profil.');
    }
    return this.db.transaction(async tx => {
      const [ad] = await tx.select({ id: ads.id, userId: ads.userId, status: ads.status }).from(ads).where(eq(ads.id, id)).for('share');
      if (!ad || ad.status === 'hidden') throw new NotFoundException('Oglas nije pronađen.');
      let counted = false;
      if (ad.userId !== viewerId) {
        const inserted = await tx.insert(adViews).values({ adId: id, viewerId }).onConflictDoNothing().returning({ adId: adViews.adId });
        counted = inserted.length > 0;
      }
      const [total] = await tx.select({ count: sql<number>`count(*)::integer` }).from(adViews).where(eq(adViews.adId, id));
      return { viewCount: Number(total.count), counted };
    });
  }

  async findSellerProfile(sellerId: number, page = 1, status = 'all', viewerId?: number) {
    if (!Number.isSafeInteger(sellerId) || sellerId <= 0 || !Number.isSafeInteger(page) || page < 1 || page > 1000000 || !['all', 'active', 'sold', 'expired'].includes(status)) {
      throw new BadRequestException('Neispravan prodavatelj ili filtar.');
    }
    const [seller] = await this.db.select({ id: users.id, username: users.username, pfp: users.pfp, city: users.city, country: users.country, memberSince: users.dateCreated, verified: users.sellerVerified, badges: users.badges, dealerStatus: users.dealerStatus, dealerProfile: users.dealerProfile }).from(users).where(and(eq(users.id, sellerId), eq(users.accountStatus, 'active')));
    if (!seller) throw new NotFoundException('Prodavatelj nije pronađen.');
    if (seller.dealerStatus !== 'approved') seller.dealerProfile = null;
    const publicAds = and(eq(ads.userId, sellerId), ne(ads.status, 'hidden'));
    const [summary] = await this.db.select({
      total: sql<number>`count(*)::integer`,
      active: sql<number>`count(*) filter (where ${ads.status} = 'active' and ${ads.expiresAt} > now())::integer`,
      sold: sql<number>`count(*) filter (where ${ads.status} = 'sold')::integer`,
      expired: sql<number>`count(*) filter (where ${ads.status} = 'active' and ${ads.expiresAt} <= now())::integer`,
    }).from(ads).where(publicAds);
    const filter = status === 'active' ? activeAdsCondition() : status === 'sold' ? eq(ads.status, 'sold') : status === 'expired' ? and(eq(ads.status, 'active'), lte(ads.expiresAt, sql`now()`)) : undefined;
    const idRows = await this.db.select({ id: ads.id }).from(ads).where(and(publicAds, filter)).orderBy(desc(ads.dateCreated), desc(ads.id)).limit(20).offset((page - 1) * 20);
    const ids = idRows.map(row => row.id);
    const listings = ids.length ? this.mapJoinedAds(await this.getAdsWithRelations(and(publicAds, filter, inArray(ads.id, ids)))) : [];
    const saved = viewerId && ids.length ? await this.db.select({ adId: savedAds.adId }).from(savedAds).where(and(eq(savedAds.userId, viewerId), inArray(savedAds.adId, ids))) : [];
    const savedIds = new Set(saved.map(row => row.adId));
    return { seller, summary, page, pageSize: 20, total: status === 'all' ? summary.total : summary[status as 'active' | 'sold' | 'expired'], listings: listings.map(ad => ({ ...ad, is_saved: savedIds.has(ad.id) })) };
  }

  async findRecentlyViewed(ids: number[]) {
    if (!ids.length) return [];
    const rows = await this.getAdsWithRelations(and(inArray(ads.id, ids), ne(ads.status, 'hidden'), publicSellerCondition()));
    const mapped = new Map(this.mapJoinedAds(rows).map(ad => [ad.id, ad]));
    return ids.flatMap(id => mapped.has(id) ? [mapped.get(id)!] : []);
  }

  async updateStatus(id: number, userId: number, status: string) {
    if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(userId) || userId <= 0 || !['active', 'sold', 'hidden'].includes(status)) {
      throw new BadRequestException('Neispravan oglas ili status.');
    }
    const [updated] = await this.db.update(ads).set({
      status: status as 'active' | 'sold' | 'hidden', dateLastUpdated: new Date(),
      soldAt: status === 'sold' ? sql`coalesce(${ads.soldAt}, now())` : null,
    }).where(and(eq(ads.id, id), eq(ads.userId, userId), or(isNull(ads.moderationStatus), eq(ads.moderationStatus, 'approved')))).returning({ id: ads.id });
    if (!updated) throw new NotFoundException('Oglas nije pronađen, nije vaš ili je ograničen moderacijom.');
    return this.findOne(id, userId);
  }

  async update(id: number, userId: number, dto: UpdateAdDto, uploadedImages: string[] = [], onPersisted?: () => void) {
    if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(userId) || userId <= 0) {
      throw new BadRequestException('Neispravan oglas ili korisnik.');
    }
    const { retainedImages, imageOrder, price, fuelConsumption, ...fields } = dto;
    for (const field of ['category', 'subcategory', 'brand', 'model', 'title'] as const) {
      if (fields[field] !== undefined && !fields[field]?.trim()) throw new BadRequestException('Obavezna polja ne mogu biti prazna.');
    }
    if (!Object.keys(fields).length && price === undefined && fuelConsumption === undefined && retainedImages === undefined && !uploadedImages.length) {
      throw new BadRequestException('Nema promjena za spremanje.');
    }
    let retained: string[] | undefined;
    if (retainedImages !== undefined) {
      try {
        const parsed: unknown = JSON.parse(retainedImages);
        if (!Array.isArray(parsed) || parsed.some(value => typeof value !== 'string') || new Set(parsed).size !== parsed.length) {
          throw new Error('Invalid images');
        }
        retained = parsed as string[];
      } catch { throw new BadRequestException('Neispravan popis slika.'); }
    }
    await this.db.transaction(async tx => {
      const [owned] = await tx.select().from(ads).where(and(eq(ads.id, id), eq(ads.userId, userId))).for('update');
      if (!owned) throw new NotFoundException('Oglas nije pronađen ili nije vaš.');
      const existing = await tx.select().from(adImages).where(eq(adImages.adId, id)).orderBy(asc(adImages.id));
      if (retained?.some(url => !existing.some(image => image.imageUrl === url))) {
        throw new BadRequestException('Slika ne pripada ovom oglasu.');
      }
      let images = [...(retained ?? existing.map(image => image.imageUrl)), ...uploadedImages];
      if (imageOrder !== undefined) {
        let order: unknown;
        try { order = JSON.parse(imageOrder); } catch { throw new BadRequestException('Neispravan redoslijed slika.'); }
        const entries = new Map([
          ...(retained ?? existing.map(image => image.imageUrl)).map(url => [url, url] as const),
          ...uploadedImages.map((url, index) => [`new:${index}`, url] as const),
        ]);
        if (!Array.isArray(order) || order.length !== entries.size || new Set(order).size !== order.length || order.some(key => typeof key !== 'string' || !entries.has(key))) {
          throw new BadRequestException('Neispravan redoslijed slika.');
        }
        images = (order as string[]).map(key => entries.get(key)!);
      }
      if (images.length > 10) throw new BadRequestException('Oglas može imati najviše 10 slika.');
      await tx.update(ads).set({ ...fields, ...(price === undefined ? {} : { price: String(price) }),
        ...(fields.vin === undefined ? {} : { vin: fields.vin?.toUpperCase() || null }),
        ...(fuelConsumption === undefined ? {} : { fuelConsumption: fuelConsumption === null ? null : String(fuelConsumption) }),
        dateLastUpdated: new Date(), ...(retained !== undefined || uploadedImages.length ? { previewImg: images[0] ?? null } : {}),
      }).where(and(eq(ads.id, id), eq(ads.userId, userId)));
      if (price !== undefined && owned.price != null && Number(price) < Number(owned.price)) {
        const subscribers = await tx.select({ userId: savedAds.userId }).from(savedAds)
          .where(and(eq(savedAds.adId, id), ne(savedAds.userId, userId)));
        if (subscribers.length) await tx.insert(priceDropNotifications).values(subscribers.map(subscriber => ({
          userId: subscriber.userId, adId: id, oldPrice: owned.price!, newPrice: String(price),
        })));
      }
      if (retained !== undefined || uploadedImages.length) {
        await tx.delete(adImages).where(eq(adImages.adId, id));
        if (images.length) await tx.insert(adImages).values(await Promise.all(images.map(async imageUrl => ({ adId: id, imageUrl, sha256: await imageDigest(imageUrl) }))));
      }
    });
    onPersisted?.();
    return this.findOne(id, userId);
  }

  remove(id: number) {
    return `This action removes a #${id} ad`;
  }

  /*-------------------------SAVING---------------------------*/
  async getPriceDropNotifications(userId: number) {
    const visible = and(eq(priceDropNotifications.userId, userId), ne(ads.status, 'hidden'));
    const items = await this.db.select({
      id: priceDropNotifications.id, adId: ads.id, title: ads.title,
      oldPrice: priceDropNotifications.oldPrice, newPrice: priceDropNotifications.newPrice,
      createdAt: priceDropNotifications.createdAt, readAt: priceDropNotifications.readAt,
    }).from(priceDropNotifications).innerJoin(ads, eq(ads.id, priceDropNotifications.adId))
      .where(visible).orderBy(desc(sql`${priceDropNotifications.readAt} is null`), desc(priceDropNotifications.id)).limit(30);
    const [count] = await this.db.select({ value: sql<number>`count(*)::integer` })
      .from(priceDropNotifications).innerJoin(ads, eq(ads.id, priceDropNotifications.adId))
      .where(and(visible, sql`${priceDropNotifications.readAt} is null`));
    return { items, unreadCount: count.value };
  }

  async readPriceDropNotification(id: number, userId: number) {
    const [updated] = await this.db.update(priceDropNotifications)
      .set({ readAt: sql`coalesce(${priceDropNotifications.readAt}, now())` })
      .where(and(eq(priceDropNotifications.id, id), eq(priceDropNotifications.userId, userId)))
      .returning({ id: priceDropNotifications.id });
    if (!updated) throw new NotFoundException('Obavijest nije pronađena.');
    return { success: true };
  }

  async saveAd(userId: number, adId: number) {
    if (
      !Number.isFinite(userId) ||
      userId <= 0 ||
      !Number.isFinite(adId) ||
      adId <= 0
    ) {
      throw new BadRequestException('Invalid user ID or ads ID.');
    }

    this.logger.debug('Saving...');
    const insertedRows = await this.db
      .insert(savedAds)
      .values({ userId, adId })
      .onConflictDoNothing()
      .returning({ userId: savedAds.userId });
    const saved = insertedRows.length > 0;

    this.logger.debug(`Saved status: ${saved}`);
    return {
      message: 'Ad saved successfully.',
      saved,
    };
  }

  async unsaveAd(userId: number, adId: number) {
    if (
      !Number.isFinite(userId) ||
      userId <= 0 ||
      !Number.isFinite(adId) ||
      adId <= 0
    ) {
      throw new BadRequestException('Invalid user ID or ads ID.');
    }

    const deletedRows = await this.db
      .delete(savedAds)
      .where(and(eq(savedAds.userId, userId), eq(savedAds.adId, adId)))
      .returning({ userId: savedAds.userId });

    return {
      message: 'Ad unsaved successfully.',
      deleted: deletedRows.length > 0,
    };
  }

  async checkIfSaved(userId: number, adId: number) {
    if (
      !Number.isFinite(userId) ||
      userId <= 0 ||
      !Number.isFinite(adId) ||
      adId <= 0
    ) {
      throw new BadRequestException('Invalid user ID or ads ID.');
    }

    const [savedRow] = await this.db
      .select({ userId: savedAds.userId })
      .from(savedAds)
      .where(and(eq(savedAds.userId, userId), eq(savedAds.adId, adId)))
      .limit(1);

    return { isSaved: Boolean(savedRow) };
  }
}
