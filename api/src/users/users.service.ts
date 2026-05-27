import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Ad } from '../ad/entities/ad.entity';
import { AdImage } from '../ad/entities/ad-image.entity';
import { SavedAd } from '../ad/entities/saved-ad.entity';

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(
        @InjectRepository(User) private readonly usersRepo: Repository<User>,
        @InjectRepository(Ad) private readonly adsRepo: Repository<Ad>,
        @InjectRepository(AdImage) private readonly adImagesRepo: Repository<AdImage>,
        @InjectRepository(SavedAd) private readonly savedAdsRepo: Repository<SavedAd>,
        private readonly dataSource: DataSource,
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
        const user = await this.usersRepo.findOne({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException('Korisnik nije pronađen.');
        }

        return this.mapUserEntity(user);
    }

    async updatePfp(userId: number, pfpPath: string) {
        if (!pfpPath?.trim()) {
            throw new BadRequestException('Profilna slika nije proslijedena.');
        }

        const user = await this.usersRepo.findOne({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException('Korisnik nije pronaden.');
        }

        user.pfp = pfpPath.trim();
        const saved = await this.usersRepo.save(user);

        this.logger.debug(`Updated profile picture for user ${userId}`);

        return {
            id: saved.id,
            pfp: saved.pfp,
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

        const user = await this.usersRepo.findOne({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException('Korisnik nije pronađen.');
        }

        user.firstName = firstName || null;
        user.lastName = lastName || null;
        user.phone = phone || null;
        user.city = city || null;
        user.country = country || null;

        const saved = await this.usersRepo.save(user);

        this.logger.debug(`Updated profile fields for user ${userId}`);
        return this.mapUserEntity(saved);
    }

    async deleteMe(userId: number) {
        if (!Number.isFinite(userId) || userId <= 0) {
            throw new BadRequestException('Neispravan korisnik.');
        }

        await this.dataSource.transaction(async (manager) => {
            const usersRepo = manager.getRepository(User);
            const adsRepo = manager.getRepository(Ad);
            const adImagesRepo = manager.getRepository(AdImage);
            const savedAdsRepo = manager.getRepository(SavedAd);

            // Remove saved entries created by this user.
            await savedAdsRepo.delete({ userId });

            // Remove saved references to ads owned by this user.
            const ownedAds = await adsRepo.find({ select: { id: true }, where: { userId } });
            const ownedAdIds = ownedAds.map((ad) => ad.id);
            if (ownedAdIds.length > 0) {
                await savedAdsRepo.delete({ adId: In(ownedAdIds) });
                await adImagesRepo.delete({ adId: In(ownedAdIds) });
            }

            await adsRepo.delete({ userId });

            const deleteUserResult = await usersRepo.delete({ id: userId });
            if (!deleteUserResult.affected) {
                throw new NotFoundException('Korisnik nije pronađen.');
            }
        });

        this.logger.debug(`Deleted user account ${userId}`);

        return {
            message: 'Račun je uspješno izbrisan.',
        };
    }
}
