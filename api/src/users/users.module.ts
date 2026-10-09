import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { DrizzleModule } from '../db/drizzle/drizzle.module';
import {NodePgDatabase} from "drizzle-orm/node-postgres";
import {JwtModule} from "@nestjs/jwt";
import {JwtStrategy} from "./jwt.strategy";
import { LoginAttemptsService } from './login-attempts.service';
import { RegistrationAttemptsService } from './registration-attempts.service';
import { AuditModule } from '../audit/audit.module';

const jwtSecret = process.env.JWT_SECRET ?? 'dev_jwt_secret';
if (!process.env.JWT_SECRET) {
    console.warn(
        'Warning: JWT_SECRET is not set. Using development fallback secret. Do not use in production.',
    );
}

@Module({
    imports: [
        JwtModule.register({
            secret: jwtSecret,
            signOptions: { expiresIn: '24h' },
        }),
        DrizzleModule,
        AuditModule,
    ],
    controllers: [UsersController],
    providers: [UsersService, JwtStrategy, LoginAttemptsService, RegistrationAttemptsService],
    exports: [JwtModule],
})
export class UsersModule {}
