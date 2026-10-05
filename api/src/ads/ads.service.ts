import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {and, asc, desc, eq, gte, ilike, inArray, lte, or, type SQL,} from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { CreateAdDto, UpdateAdDto } from '../dtos/ad.dtos';
import * as schema from '../db/schema';

const { ads, adImages, savedAds, users } = schema;
type Ad = typeof ads.$inferSelect;
type AdWithRelations = {
  ad: Ad;
  sellerUsername: string | null;
  imageUrl: string | null;
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
  ) {
    return {
      id: ad.id,
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
      fuel: ad.fuel,
      condition: ad.condition,
      county: ad.county,
      seller_type: ad.sellerType,
      buy_or_lease: ad.buyOrLease,
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
      { ad: Ad; sellerUsername: string | null; images: string[] }
    >();

    for (const row of rows) {
      let groupedAd = grouped.get(row.ad.id);
      if (!groupedAd) {
        groupedAd = {
          ad: row.ad,
          sellerUsername: row.sellerUsername,
          images: [],
        };
        grouped.set(row.ad.id, groupedAd);
      }
      if (row.imageUrl) groupedAd.images.push(row.imageUrl);
    }

    return [...grouped.values()].map(({ ad, sellerUsername, images }) =>
      this.mapAdForApi(ad, sellerUsername, images),
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



  async create(createAdDto: CreateAdDto, imageUrls: string[] = []) {
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

          category: category,
          subcategory: subcategory,
          brand: brand,
          model: model,
          price: String(createAdDto.price),
          kilometrage: createAdDto.kilometrage,
          year: year ?? null,
          fuel: createAdDto.fuel || null,
          condition: createAdDto.condition || null,
          county: createAdDto.county || null,
          sellerType: createAdDto.sellerType || null,
          buyOrLease: createAdDto.buyOrLease || null,
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
          normalizedImages.map((imageUrl) => ({
            adId: ad.id,
            imageUrl,
          })),
        );
        this.logger.warn(`Inserted ${normalizedImages.length} images for ad with ID ${ad.id}.`);
      }else {
        this.logger.warn(`No images found for ad with ID ${ad.id}.`);
      }

      return [ad];
    });

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
  async findAllAds(
    userId?: number,
    filters: {
      category?: string;
      subcategory?: string;
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
    const filterConditions = this.buildFilterConditions(filters);
    const idRows = await this.db
      .select({ id: ads.id })
      .from(ads)
      .where(and(...filterConditions))
      .orderBy(desc(ads.dateCreated), desc(ads.id))
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
      .where(eq(savedAds.userId, normalizedUserId))
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
        .where(eq(ads.featured, true))
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

  async findOne(id: number) {
    const rows = await this.getAdsWithRelations(eq(ads.id, id));
    const [ad] = this.mapJoinedAds(rows);

    if (!ad) {
      throw new NotFoundException('Ad not found.');
    }

    return ad;
  }

  update(id: number, _updateAdDto: UpdateAdDto) {
    void _updateAdDto;
    return `This action updates a #${id} ad`;
  }

  remove(id: number) {
    return `This action removes a #${id} ad`;
  }

  /*-------------------------SAVING---------------------------*/
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
