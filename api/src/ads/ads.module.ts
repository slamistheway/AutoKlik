import { Module } from '@nestjs/common';
import { DrizzleModule } from '../db/drizzle/drizzle.module';
import { AdsService } from './ads.service';
import { AdsController } from './ads.controller';
import { AdFetchRateLimitGuard } from './ad-fetch-rate-limit.guard';

@Module({
  imports: [DrizzleModule],
  providers: [AdsService, AdFetchRateLimitGuard],
  controllers: [AdsController],
})
export class AdsModule {}
