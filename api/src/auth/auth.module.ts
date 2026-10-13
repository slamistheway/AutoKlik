import { Global, Module } from '@nestjs/common';
import { DrizzleModule } from '../db/drizzle/drizzle.module';
import { AuditModule } from '../audit/audit.module';
import { BetterAuthService } from './better-auth.service';
import {
  OptionalSessionAuthGuard,
  SessionAuthGuard,
} from './session-auth.guard';

@Global()
@Module({
  imports: [DrizzleModule, AuditModule],
  providers: [BetterAuthService, SessionAuthGuard, OptionalSessionAuthGuard],
  exports: [BetterAuthService, SessionAuthGuard, OptionalSessionAuthGuard],
})
export class AuthModule {}
