import { Module } from '@nestjs/common';
import { AdService } from './ad.service';
import { AdController } from './ad.controller';
import { DatabaseModule } from '../database.module';
@Module({
  imports: [DatabaseModule],
  controllers: [AdController],
  providers: [AdService],
})
export class AdModule {}
