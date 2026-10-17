import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { DrizzleModule } from '../db/drizzle/drizzle.module';
import { LoginAttemptsService } from './login-attempts.service';
import { RegistrationAttemptsService } from './registration-attempts.service';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { MessageEventsService } from './message-events.service';

@Module({
    imports: [DrizzleModule, AuditModule, AuthModule],
    controllers: [UsersController],
    providers: [UsersService, LoginAttemptsService, RegistrationAttemptsService, MessageEventsService],
})
export class UsersModule {}
