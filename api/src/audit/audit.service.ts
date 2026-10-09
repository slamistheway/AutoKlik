import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';

@Injectable()
export class AuditService {

  constructor(
    @Inject('DRIZZLE_DB') private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async record(
      action: string,
      path: string,
      userId: number | null,
      ip: string | null,
  ) {
    await this.db.insert(schema.audit).values({ action, path, userId, ip });
  }



  async recordLogin(userId: number, ip: string | null) {
    await this.record('login', '/users/login', userId, ip);
  }

  async recordLogout(userId: number, ip: string | null) {
    await this.record('logout', '/users/logout', userId, ip);
  }

  async recordRegister(userId: number, ip: string | null) {
    await this.record('register', '/users/register', userId, ip);
  }

  
}
