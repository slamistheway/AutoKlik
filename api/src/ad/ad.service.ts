import {
    BadRequestException,
    Inject,
    Injectable, Logger,
    NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { CreateAdDto } from './dto/create-ad.dto';
import { UpdateAdDto } from './dto/update-ad.dto';
import {AuthService} from "../auth/auth.service";


@Injectable()
export class AdService {
    private readonly logger = new Logger(AuthService.name);


    constructor(@Inject('DATABASE_POOL') private readonly pool: Pool) {}

    private normalizeImages(images: string[]): string[] {
        return images
            .map((image) => image.trim())
            .filter((image): image is string => image.length > 0);
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

    /*-------------------------------------------CRUD---------------------------------------------*/
    /*-------------------------------------------CRUD---------------------------------------------*/
    /*-------------------------------------------CRUD---------------------------------------------*/
    /*-------------------------------------------CRUD---------------------------------------------*/
    async deleteAd(adId: number, userId: number) {
        if (!Number.isFinite(adId) || adId <= 0 || !Number.isFinite(userId) || userId <= 0) {
            throw new BadRequestException('Invalid ad ID or user ID.');
        }

        const result = await this.pool.query(
            `DELETE FROM ads
             WHERE id = $1 AND user_id = $2`,
            [adId, userId],
        );

        if (result.rowCount === 0) {
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

        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            const result = await client.query(
                `INSERT INTO ads (
                    user_id,
                    category,
                    subcategory,
                    brand,
                    model,
                    title,
                    description,
                    year
                )
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING id, user_id, category, subcategory, brand, model, title, description, year, created_at, updated_at`,
                [user_id, category, subcategory, brand, model, title, description, year],
            );

            const createdAd = result.rows[0];

            for (const imageUrl of normalizedImages) {
                await client.query(
                    `INSERT INTO ad_images (ad_id, image_url)
                     VALUES ($1, $2)`,
                    [createdAd.id, imageUrl],
                );
            }

            await client.query('COMMIT');

            return {
                message: 'Ad created successfully.',
                ad: {
                    ...createdAd,
                    images: normalizedImages,
                },
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }



    /*-------------------------------------------SELECTING---------------------------------------------*/
    /*-------------------------------------------SELECTING---------------------------------------------*/
    /*-------------------------------------------SELECTING---------------------------------------------*/
    /*-------------------------------------------SELECTING---------------------------------------------*/
    async findAllAds(
        userId?: number | string,
        categoryOrFilters: string | {
            category?: string;
            subcategory?: string;
            brands?: string;
            models?: string;
            yearMin?: string;
            yearMax?: string;
            search?: string;
        } = {},
        filtersOrPagination: {
            category?: string;
            subcategory?: string;
            brands?: string;
            models?: string;
            yearMin?: string;
            yearMax?: string;
            search?: string;
        } | {
            limit?: number;
            offset?: number;
        } = {},
        pagination: {
            limit?: number;
            offset?: number;
        } = {},
    ) {
        const hasExplicitCategory = typeof categoryOrFilters === 'string';
        const category = hasExplicitCategory ? categoryOrFilters : categoryOrFilters.category;
        const filters = (hasExplicitCategory ? filtersOrPagination : categoryOrFilters) as {
            category?: string;
            subcategory?: string;
            brands?: string;
            models?: string;
            yearMin?: string;
            yearMax?: string;
            search?: string;
        };
        const resolvedPagination = (hasExplicitCategory ? pagination : filtersOrPagination) as {
            limit?: number;
            offset?: number;
        };

        const normalizedUserId = Number(userId);
        this.logger.debug("normalizedUserId za homapage:" + normalizedUserId);

        const safeLimit = Number.isInteger(resolvedPagination.limit) && Number(resolvedPagination.limit) > 0
            ? Math.min(Number(resolvedPagination.limit), 50)
            : 5;
        const safeOffset = Number.isInteger(resolvedPagination.offset) && Number(resolvedPagination.offset) >= 0
            ? Number(resolvedPagination.offset)
            : 0;

        const hasUserId =
            normalizedUserId !== null &&
            Number.isFinite(normalizedUserId) &&
            normalizedUserId > 0;

        const { whereClause, params } = this.buildFiltersQuery({
            ...filters,
            category: category?.trim() || filters.category,
        });

        const countResult = await this.pool.query(
            `SELECT COUNT(*)::int AS total_count
             FROM ads
             JOIN users ON users.id = ads.user_id
             ${whereClause}`,
            params,
        );

        const totalCount = Number(countResult.rows[0]?.total_count ?? 0);

        const selectParams = [...params, safeLimit, safeOffset];
        const limitPlaceholder = `$${params.length + 1}`;
        const offsetPlaceholder = `$${params.length + 2}`;

        const result = await this.pool.query(
            `${this.buildAdSelectQuery()}
         ${whereClause}
         ORDER BY ads.created_at DESC
         LIMIT ${limitPlaceholder}
         OFFSET ${offsetPlaceholder}`,
            selectParams,
        );

        if (!hasUserId) {
            this.logger.debug(hasUserId)
            this.logger.debug(`No valid user ID provided, returning ads without saved status.`);
            return {
                items: result.rows.map((ad) => ({
                ...ad,
                is_saved: false,
                })),
                totalCount,
                limit: safeLimit,
                offset: safeOffset,
            };
        }

        const savedResult = await this.pool.query(
            `SELECT ad_id FROM saved_ads WHERE user_id = $1`,
            [normalizedUserId],
        );

        const savedAdIds = new Set<number>(
            savedResult.rows.map((row: { ad_id: number | string }) => Number(row.ad_id)),
        );

        return {
            items: result.rows.map((ad) => ({
                ...ad,
                is_saved: savedAdIds.has(Number(ad.id)),
            })),
            totalCount,
            limit: safeLimit,
            offset: safeOffset,
        };
    }


    async fetchSavedAds(userId: number | string) {
        const normalizedUserId = Number(userId);
        this.logger.debug("normalizedUserId za my saved ads apge:" + normalizedUserId);

        if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) {
            throw new BadRequestException('User id is required.');
        }

        const result = await this.pool.query(
            `SELECT
                 saved_ads.ad_id AS ad_id,
                 ads.user_id,
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
                 ads.updated_at,
                 saved_ads.created_at AS saved_at
             FROM saved_ads
                      JOIN ads ON saved_ads.ad_id = ads.id
             WHERE saved_ads.user_id = $1
             ORDER BY saved_ads.created_at DESC;`,
            [normalizedUserId],
        );


        return result.rows;
    }


    async fetchAllAdsByUserId(userId: number | string) {
        const normalizedUserId = Number(userId);

        if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) {
            throw new BadRequestException('User id is required.');
        }

        const result = await this.pool.query(
            `${this.buildAdSelectQuery()}
             WHERE ads.user_id = $1
             ORDER BY ads.created_at DESC`,
            [normalizedUserId],
        );

        return result.rows;
    }






    async findOne(id: number) {
        const result = await this.pool.query(
            `${this.buildAdSelectQuery()}
             WHERE ads.id = $1`,
            [id],
        );

        if (result.rows.length === 0) {
            throw new NotFoundException('Ad not found.');
        }

        return result.rows[0];
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

        const result = await this.pool.query(
            `INSERT INTO saved_ads (user_id, ad_id, created_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (user_id, ad_id) DO NOTHING
             RETURNING user_id, ad_id`,
            [userId, adId],
        );


        this.logger.debug(`Saved status: ${result.rows.length > 0}`);

        return {
            message: 'Ad saved successfully.',
            saved: result.rows.length > 0,
        };
    }

    async unsaveAd(userId: number, adId: number) {
        if (!Number.isFinite(userId) || userId <= 0 || !Number.isFinite(adId) || adId <= 0) {
            throw new BadRequestException('Invalid user ID or ad ID.');
        }

        const result = await this.pool.query(
            `DELETE FROM saved_ads
             WHERE user_id = $1 AND ad_id = $2`,
            [userId, adId],
        );

        return {
            message: 'Ad unsaved successfully.',
            deleted: result.rowCount > 0,
        };
    }

    async checkIfSaved(userId: number, adId: number) {
        if (!Number.isFinite(userId) || userId <= 0 || !Number.isFinite(adId) || adId <= 0) {
            throw new BadRequestException('Invalid user ID or ad ID.');
        }

        const result = await this.pool.query(
            `SELECT user_id, ad_id FROM saved_ads
             WHERE user_id = $1 AND ad_id = $2`,
            [userId, adId],
        );

        return {
            isSaved: result.rows.length > 0,
        };
    }




}
