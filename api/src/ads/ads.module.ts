import { Module } from '@nestjs/common';
import { DrizzleModule } from '../db/drizzle/drizzle.module';
import { AdsService } from './ads.service';
import { AdsController } from './ads.controller';

@Module({
  imports: [DrizzleModule],
  providers: [AdsService],
  controllers: [AdsController],
})
export class AdsModule {}
