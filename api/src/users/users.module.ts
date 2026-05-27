import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { DatabaseModule } from '../database.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Ad } from '../ad/entities/ad.entity';
import { AdImage } from '../ad/entities/ad-image.entity';
import { SavedAd } from '../ad/entities/saved-ad.entity';

@Module({
    imports: [DatabaseModule, TypeOrmModule.forFeature([User, Ad, AdImage, SavedAd])],
    controllers: [UsersController],
    providers: [UsersService],
})
export class UsersModule {}
