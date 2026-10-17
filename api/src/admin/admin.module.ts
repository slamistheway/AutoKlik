import { Module } from '@nestjs/common';
import { DrizzleModule } from '../db/drizzle/drizzle.module';
import { AdminController, ReportsController } from './admin.controller';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { UserAdminService } from './user-admin.service';
import { SafetyService } from './safety.service';
import { UserAdminController, DealerController, AppealsController } from './user-admin.controller';

@Module({
  imports: [DrizzleModule],
  controllers: [AdminController, ReportsController, UserAdminController, DealerController, AppealsController],
  providers: [AdminGuard, AdminService, UserAdminService, SafetyService],
})
export class AdminModule {}
