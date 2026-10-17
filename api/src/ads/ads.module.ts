import { Module } from '@nestjs/common';
import { DrizzleModule } from '../db/drizzle/drizzle.module';
import { AdsService } from './ads.service';
import { AdsController } from './ads.controller';
import { AdFetchRateLimitGuard } from './ad-fetch-rate-limit.guard';
import { SavedSearchesService } from './saved-searches.service';

@Module({
  imports: [DrizzleModule],
  providers: [AdsService, AdFetchRateLimitGuard, SavedSearchesService],
  controllers: [AdsController],
})
export class AdsModule {}
