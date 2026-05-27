import { Module } from '@nestjs/common';
import { AdService } from './ad.service';
import { AdController } from './ad.controller';
import { DatabaseModule } from '../database.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ad } from './entities/ad.entity';
import { AdImage } from './entities/ad-image.entity';
import { SavedAd } from './entities/saved-ad.entity';
import { User } from '../users/entities/user.entity';
@Module({
  imports: [DatabaseModule, TypeOrmModule.forFeature([Ad, AdImage, User, SavedAd])],
  controllers: [AdController],
  providers: [AdService],
})
export class AdModule {}
