import { Module } from '@nestjs/common';
import { DRIZZLE_DB, drizzleProvider } from './drizzle.provider';

@Module({
  providers: [...drizzleProvider],
  exports: [DRIZZLE_DB],
})
export class DrizzleModule {}
