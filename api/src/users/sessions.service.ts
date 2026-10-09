import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';

@Injectable()
export class SessionsService {
  constructor(
    @Inject('DRIZZLE_DB') private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async assertActive(tokenHash: string) {
    const [revoked] = await this.db
      .select({ tokenHash: schema.revokedTokens.tokenHash })
      .from(schema.revokedTokens)
      .where(eq(schema.revokedTokens.tokenHash, tokenHash))
      .limit(1);
    if (revoked) throw new UnauthorizedException('Sesija je odjavljena.');
  }

  async logout(
    tokenHash: string,
    userId: number,
    expiresAt: number,
    ip: string | null,
  ) {
    await this.db.transaction(async (tx) => {
      await tx
        .insert(schema.revokedTokens)
        .values({ tokenHash, expiresAt: new Date(expiresAt * 1000) })
        .onConflictDoNothing();
      await tx
        .insert(schema.audit)
        .values({ action: 'logout', path: '/users/logout', userId, ip });
    });
    return { message: 'Odjava uspješna.' };
  }
}
