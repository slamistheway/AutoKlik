import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { DrizzleModule } from '../db/drizzle/drizzle.module';
import {NodePgDatabase} from "drizzle-orm/node-postgres";

@Module({
    imports: [DrizzleModule],
    providers: [UsersService],
    controllers: [UsersController],
})
export class UsersModule {}