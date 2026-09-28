import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { UpdateProfileDto } from '../dtos/update-profile.dto';
import * as schema from '../db/schema';

const { users, ads, adImages, savedAds } = schema;
type User = typeof users.$inferSelect;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @Inject('DRIZZLE_DB') private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  private mapUserEntity(user: User) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      pfp: user.pfp,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      city: user.city,
      country: user.country,
    };
  }

  async getMe(userId: number) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new NotFoundException('Korisnik nije pronađen.');
    }

    return this.mapUserEntity(user);
  }

  async updatePfp(userId: number, pfpPath: string) {
    if (!pfpPath?.trim()) {
      throw new BadRequestException('Profilna slika nije proslijedena.');
    }

    const [updatedUser] = await this.db
      .update(users)
      .set({ pfp: pfpPath.trim() })
      .where(eq(users.id, userId))
      .returning({ id: users.id, pfp: users.pfp });

    if (!updatedUser) {
      throw new NotFoundException('Korisnik nije pronaden.');
    }

    this.logger.debug(`Updated profile picture for user ${userId}`);

    return updatedUser;
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

    const [updatedUser] = await this.db
      .update(users)
      .set({
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
        city: city || null,
        country: country || null,
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      throw new NotFoundException('Korisnik nije pronađen.');
    }

    this.logger.debug(`Updated profile fields for user ${userId}`);
    return this.mapUserEntity(updatedUser);
  }

  async deleteMe(userId: number) {
    if (!Number.isFinite(userId) || userId <= 0) {
      throw new BadRequestException('Neispravan korisnik.');
    }

    await this.db.transaction(async (tx) => {
      // Remove saved entries created by this user.
      await tx.delete(savedAds).where(eq(savedAds.userId, userId));

      // Remove saved references to ads owned by this user and their images.
      const ownedAds = await tx
        .select({ id: ads.id })
        .from(ads)
        .where(eq(ads.userId, userId));
      const ownedAdIds = ownedAds.map((ad) => ad.id);
      if (ownedAdIds.length > 0) {
        await tx.delete(savedAds).where(inArray(savedAds.adId, ownedAdIds));
        await tx.delete(adImages).where(inArray(adImages.adId, ownedAdIds));
      }

      await tx.delete(ads).where(eq(ads.userId, userId));

      const [deletedUser] = await tx
        .delete(users)
        .where(eq(users.id, userId))
        .returning({ id: users.id });

      if (!deletedUser) {
        throw new NotFoundException('Korisnik nije pronađen.');
      }
    });

    this.logger.debug(`Deleted user account ${userId}`);

    return {
      message: 'Račun je uspješno izbrisan.',
    };
  }
}
