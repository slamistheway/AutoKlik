import {
    BadRequestException,
    Injectable, Logger,
    NotFoundException,
} from '@nestjs/common';
import { CreateAdDto } from './dto/create-ad.dto';
import { UpdateAdDto } from './dto/update-ad.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, In, QueryFailedError, Repository } from 'typeorm';
import { Ad } from './entities/ad.entity';
import { AdImage } from './entities/ad-image.entity';
import { SavedAd } from './entities/saved-ad.entity';


@Injectable()
export class AdService {
    private readonly logger = new Logger(AdService.name);

    constructor(
        @InjectRepository(Ad) private readonly adsRepo: Repository<Ad>,
        @InjectRepository(AdImage) private readonly adImagesRepo: Repository<AdImage>,
        @InjectRepository(SavedAd) private readonly savedAdsRepo: Repository<SavedAd>,
        private readonly dataSource: DataSource,
    ) {}

    private normalizeImages(images: string[]): string[] {
        return images
            .map((image) => image.trim())
            .filter((image): image is string => image.length > 0);
    }

    private mapAdForApi(ad: Ad): any {
        const images = (ad.images ?? [])
            .slice()
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
            .map((img) => img.imageUrl);

        return {
            id: ad.id,
            user_id: ad.userId,
            seller_username: ad.user?.username ?? '',
            category: ad.category,
            subcategory: ad.subcategory,
            brand: ad.brand,
            model: ad.model,
            title: ad.title,
            description: ad.description,
            year: ad.year,
            images,
            created_at: ad.createdAt,
            updated_at: ad.updatedAt,
        };
    }

    private normalizeCsvValues(value?: string): string[] {
        if (!value) {
            return [];
        }

        return value
            .split(',')
            .map((item) => item.trim())
            .filter((item) => item.length > 0);
    }

    private toValidYear(value?: string): number | null {
        if (!value) {
            return null;
        }

        const parsed = Number(value);
        return Number.isInteger(parsed) ? parsed : null;
    }


    private buildFiltersQuery(filters: {
        category?: string;
        subcategory?: string;
        brands?: string;
        models?: string;
        yearMin?: string;
        yearMax?: string;
        search?: string;
    }): { whereClause: string; params: Array<string | number | string[]> } {
        const whereClauses: string[] = [];
        const params: Array<string | number | string[]> = [];

        const pushParam = (value: string | number | string[]) => {
            params.push(value);
            return `$${params.length}`;
        };

        const category = filters.category?.trim();
        if (category) {
            whereClauses.push(`ads.category = ${pushParam(category)}`);
        }

        const subcategory = filters.subcategory?.trim();
        if (subcategory) {
            whereClauses.push(`ads.subcategory = ${pushParam(subcategory)}`);
        }

        const brands = this.normalizeCsvValues(filters.brands);
        if (brands.length > 0) {
            whereClauses.push(`ads.brand = ANY(${pushParam(brands)}::text[])`);
        }

        const models = this.normalizeCsvValues(filters.models);
        if (models.length > 0) {
            whereClauses.push(`ads.model = ANY(${pushParam(models)}::text[])`);
        }

        const yearMin = this.toValidYear(filters.yearMin);
        if (yearMin !== null) {
            whereClauses.push(`ads.year >= ${pushParam(yearMin)}`);
        }

        const yearMax = this.toValidYear(filters.yearMax);
        if (yearMax !== null) {
            whereClauses.push(`ads.year <= ${pushParam(yearMax)}`);
        }

        const search = filters.search?.trim();
        if (search) {
            const token = `%${search}%`;
            const searchParam = pushParam(token);
            whereClauses.push(
                `(ads.title ILIKE ${searchParam} OR ads.description ILIKE ${searchParam} OR ads.brand ILIKE ${searchParam} OR ads.model ILIKE ${searchParam})`,
            );
        }

        return {
            whereClause: whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '',
            params,
        };
    }

    private buildAdSelectQuery() {
        return `
            SELECT
                ads.id,
                ads.user_id,
                users.username AS seller_username,
                ads.category,
                ads.subcategory,
                ads.brand,
                ads.model,
                ads.title,
                ads.description,
                ads.year,
                COALESCE(
                    (
                        SELECT JSON_AGG(ad_images.image_url ORDER BY ad_images.created_at)
                        FROM ad_images
                        WHERE ad_images.ad_id = ads.id
                    ),
                    '[]'::json
                ) AS images,
                ads.created_at,
                ads.updated_at
            FROM ads
            JOIN users ON users.id = ads.user_id
        `;
    }

    private applyFilters(
        qb: ReturnType<Repository<Ad>['createQueryBuilder']>,
        filters: {
            category?: string;
            subcategory?: string;
            brands?: string;
            models?: string;
            yearMin?: string;
            yearMax?: string;
            search?: string;
        },
    ): void {
        const category = filters.category?.trim();
        if (category) {
            qb.andWhere('ads.category = :category', { category });
        }

        const subcategory = filters.subcategory?.trim();
        if (subcategory) {
            qb.andWhere('ads.subcategory = :subcategory', { subcategory });
        }

        const brands = this.normalizeCsvValues(filters.brands);
        if (brands.length > 0) {
            qb.andWhere('ads.brand IN (:...brands)', { brands });
        }

        const models = this.normalizeCsvValues(filters.models);
        if (models.length > 0) {
            qb.andWhere('ads.model IN (:...models)', { models });
        }

        const yearMin = this.toValidYear(filters.yearMin);
        if (yearMin !== null) {
            qb.andWhere('ads.year >= :yearMin', { yearMin });
        }

        const yearMax = this.toValidYear(filters.yearMax);
        if (yearMax !== null) {
            qb.andWhere('ads.year <= :yearMax', { yearMax });
        }

        const search = filters.search?.trim();
        if (search) {
            const token = `%${search}%`;
            qb.andWhere(
                new Brackets((inner) => {
                    inner
                        .where('ads.title ILIKE :token', { token })
                        .orWhere('ads.description ILIKE :token', { token })
                        .orWhere('ads.brand ILIKE :token', { token })
                        .orWhere('ads.model ILIKE :token', { token });
                }),
            );
        }
    }

    /*-------------------------------------------CRUD---------------------------------------------*/
    /*-------------------------------------------CRUD---------------------------------------------*/
    /*-------------------------------------------CRUD---------------------------------------------*/
    /*-------------------------------------------CRUD---------------------------------------------*/
    async deleteAd(adId: number, userId: number) {
        if (!Number.isFinite(adId) || adId <= 0 || !Number.isFinite(userId) || userId <= 0) {
            throw new BadRequestException('Invalid ad ID or user ID.');
        }

        const result = await this.adsRepo.delete({ id: adId, userId });
        if (!result.affected) {
            throw new NotFoundException('Ad not found or you do not have permission to delete it.');
        }

        this.logger.log(`Ad with ID ${adId} deleted by user with ID ${userId}.`);
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
            throw new BadRequestException('Required ad fields are missing.');
        }

        const createdAd = await this.dataSource.transaction(async (manager) => {
            const adsRepo = manager.getRepository(Ad);
            const imagesRepo = manager.getRepository(AdImage);

            const ad = adsRepo.create({
                userId: user_id,
                category,
                subcategory,
                brand,
                model,
                title: title ?? null,
                description: description ?? null,
                year: typeof year === 'number' ? year : null,
            });

            const savedAd = await adsRepo.save(ad);

            if (normalizedImages.length > 0) {
                await imagesRepo.insert(
                    normalizedImages.map((imageUrl) => ({
                        adId: savedAd.id,
                        imageUrl,
                    })),
                );
            }

            return savedAd;
        });

        const adWithRelations = await this.adsRepo.findOne({
            where: { id: createdAd.id },
            relations: { user: true, images: true },
        });

        return {
            message: 'Ad created successfully.',
            ad: {
                ...(adWithRelations ? this.mapAdForApi(adWithRelations) : { id: createdAd.id, user_id }),
                images: normalizedImages,
            },
        };
    }



    /*-------------------------------------------SELECTING---------------------------------------------*/
    /*-------------------------------------------SELECTING---------------------------------------------*/
    /*-------------------------------------------SELECTING---------------------------------------------*/
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

        const idsQb = this.adsRepo
            .createQueryBuilder('ads')
            .select('ads.id', 'id');

        this.applyFilters(idsQb, filters);

        idsQb
            .orderBy('ads.createdAt', 'DESC')
            .addOrderBy('ads.id', 'DESC')
            .take(MAX_RECENT_ADS);

        const idRows = await idsQb.getRawMany<{ id: number | string }>();
        const adIds = idRows
            .map((row) => Number(row.id))
            .filter((id) => Number.isFinite(id) && id > 0);

        if (adIds.length === 0) {
            return [];
        }

        const ads = await this.adsRepo
            .createQueryBuilder('ads')
            .leftJoinAndSelect('ads.user', 'users')
            .leftJoinAndSelect('ads.images', 'images')
            .where('ads.id IN (:...adIds)', { adIds })
            .orderBy('ads.createdAt', 'DESC')
            .addOrderBy('ads.id', 'DESC')
            .addOrderBy('images.createdAt', 'ASC')
            .getMany();

        const adsById = new Map<number, Ad>(ads.map((ad) => [ad.id, ad] as const));
        const orderedAds = adIds
            .map((id) => adsById.get(id))
            .filter((ad): ad is Ad => Boolean(ad));

        let savedAdIds = new Set<number>();
        if (hasUserId) {
            const savedRows = await this.savedAdsRepo.find({
                select: { adId: true },
                where: {
                    userId: normalizedUserId,
                    adId: In(adIds),
                },
            });

            savedAdIds = new Set(savedRows.map((row) => row.adId));
        }

        return orderedAds.map((ad) => ({
            ...this.mapAdForApi(ad),
            is_saved: hasUserId ? savedAdIds.has(ad.id) : false,
        }));
    }



    async fetchSavedAds(userId: number | string) {
        const normalizedUserId = Number(userId);
        this.logger.debug("normalizedUserId za my saved ads apge:" + normalizedUserId);

        if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) {
            throw new BadRequestException('User id is required.');
        }

        const saved = await this.savedAdsRepo.find({
            where: { userId: normalizedUserId },
            relations: { ad: { images: true, user: true } },
            order: { createdAt: 'DESC' },
        });

        return saved
            .filter((row) => Boolean(row.ad))
            .map((row) => {
                const ad = row.ad;
                const images = (ad.images ?? [])
                    .slice()
                    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
                    .map((img) => img.imageUrl);

                return {
                    ad_id: ad.id,
                    user_id: ad.userId,
                    category: ad.category,
                    subcategory: ad.subcategory,
                    brand: ad.brand,
                    model: ad.model,
                    title: ad.title,
                    description: ad.description,
                    year: ad.year,
                    images,
                    created_at: ad.createdAt,
                    updated_at: ad.updatedAt,
                    saved_at: row.createdAt,
                };
            });
    }


    async fetchAllAdsByUserId(userId: number | string) {
        const normalizedUserId = Number(userId);

        if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) {
            throw new BadRequestException('User id is required.');
        }

        const ads = await this.adsRepo.find({
            where: { userId: normalizedUserId },
            relations: { user: true, images: true },
            order: { createdAt: 'DESC' },
        });

        return ads.map((ad) => this.mapAdForApi(ad));
    }






    async findOne(id: number) {
        const ad = await this.adsRepo.findOne({
            where: { id },
            relations: { user: true, images: true },
        });

        if (!ad) {
            throw new NotFoundException('Ad not found.');
        }

        return this.mapAdForApi(ad);
    }

    update(id: number, _updateAdDto: UpdateAdDto) {
        return `This action updates a #${id} ad`;
    }

    remove(id: number) {
        return `This action removes a #${id} ad`;
    }





    /*-------------------------SAVING---------------------------*/
    async saveAd(userId: number, adId: number) {
        if (!Number.isFinite(userId) || userId <= 0 || !Number.isFinite(adId) || adId <= 0) {
            throw new BadRequestException('Invalid user ID or ad ID.');
        }

        this.logger.debug(`Saving...`);

        let saved = false;
        try {
            await this.savedAdsRepo.insert({ userId, adId });
            saved = true;
        } catch (error) {
            if (error instanceof QueryFailedError) {
                const driverError: any = (error as any).driverError;
                if (driverError?.code === '23505') {
                    saved = false;
                } else {
                    throw error;
                }
            } else {
                throw error;
            }
        }

        this.logger.debug(`Saved status: ${saved}`);

        return {
            message: 'Ad saved successfully.',
            saved,
        };
    }

    async unsaveAd(userId: number, adId: number) {
        if (!Number.isFinite(userId) || userId <= 0 || !Number.isFinite(adId) || adId <= 0) {
            throw new BadRequestException('Invalid user ID or ad ID.');
        }

        const result = await this.savedAdsRepo.delete({ userId, adId });

        return {
            message: 'Ad unsaved successfully.',
            deleted: Boolean(result.affected && result.affected > 0),
        };
    }

    async checkIfSaved(userId: number, adId: number) {
        if (!Number.isFinite(userId) || userId <= 0 || !Number.isFinite(adId) || adId <= 0) {
            throw new BadRequestException('Invalid user ID or ad ID.');
        }

        const exists = await this.savedAdsRepo.exists({ where: { userId, adId } });
        return { isSaved: exists };
    }




}
