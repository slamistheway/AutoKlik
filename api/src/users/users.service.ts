import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(@Inject('DATABASE_POOL') private readonly pool: Pool) {}

    private mapUserRow(user: any) {
        return {
            id: user.id,
            username: user.username,
            email: user.email,
            pfp: user.pfp,
            firstName: user.first_name,
            lastName: user.last_name,
            phone: user.phone,
            city: user.city,
            country: user.country,
        };
    }

    async getMe(userId: number) {
        const result = await this.pool.query(
            'SELECT id, username, email, pfp, first_name, last_name, phone, city, country FROM users WHERE id = $1',
            [userId],
        );

        if (result.rows.length === 0) {
            throw new NotFoundException('Korisnik nije pronađen.');
        }

        this.logger.debug(`Found ${result.rows.length} rows`);

        return this.mapUserRow(result.rows[0]);
    }

    async updatePfp(userId: number, pfpPath: string) {
        if (!pfpPath?.trim()) {
            throw new BadRequestException('Profilna slika nije proslijedena.');
        }

        const result = await this.pool.query(
            `UPDATE users
             SET pfp = $2
             WHERE id = $1
             RETURNING id, pfp`,
            [userId, pfpPath.trim()],
        );

        if (result.rows.length === 0) {
            throw new NotFoundException('Korisnik nije pronaden.');
        }

        this.logger.debug(`Updated profile picture for user ${userId}`);

        return {
            id: result.rows[0].id,
            pfp: result.rows[0].pfp,
        };
    }

    async updateProfile(userId: number, updateProfileDto: UpdateProfileDto) {
        if (!Number.isFinite(userId) || userId <= 0) {
            throw new BadRequestException('Neispravan korisnik.');
        }

        const firstName = updateProfileDto.firstName?.trim() ?? '';
        const lastName = updateProfileDto.lastName?.trim() ?? '';
        const phone = updateProfileDto.phone?.trim() ?? '';
        const city = updateProfileDto.city?.trim() ?? '';
        const country = updateProfileDto.country?.trim() ?? '';

        const result = await this.pool.query(
            `UPDATE users
             SET first_name = $2,
                 last_name = $3,
                 phone = $4,
                 city = $5,
                 country = $6
             WHERE id = $1
             RETURNING id, username, email, pfp, first_name, last_name, phone, city, country`,
            [userId, firstName || null, lastName || null, phone || null, city || null, country || null],
        );

        if (result.rows.length === 0) {
            throw new NotFoundException('Korisnik nije pronađen.');
        }

        this.logger.debug(`Updated profile fields for user ${userId}`);
        return this.mapUserRow(result.rows[0]);
    }

    async deleteMe(userId: number) {
        if (!Number.isFinite(userId) || userId <= 0) {
            throw new BadRequestException('Neispravan korisnik.');
        }

        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Remove saved entries created by this user.
            await client.query('DELETE FROM saved_ads WHERE user_id = $1', [userId]);

            // Remove saved references to ads owned by this user.
            await client.query(
                `DELETE FROM saved_ads
                 WHERE ad_id IN (SELECT id FROM ads WHERE user_id = $1)`,
                [userId],
            );

            await client.query(
                `DELETE FROM ad_images
                 WHERE ad_id IN (SELECT id FROM ads WHERE user_id = $1)`,
                [userId],
            );

            await client.query('DELETE FROM ads WHERE user_id = $1', [userId]);

            const deletedUserResult = await client.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);

            if (deletedUserResult.rows.length === 0) {
                throw new NotFoundException('Korisnik nije pronađen.');
            }

            await client.query('COMMIT');
            this.logger.debug(`Deleted user account ${userId}`);

            return {
                message: 'Račun je uspješno izbrisan.',
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}
