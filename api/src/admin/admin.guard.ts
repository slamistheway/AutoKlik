import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(@Inject('DRIZZLE_DB') private readonly db: NodePgDatabase<typeof schema>) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ user?: { id: number }; staffRole?: string }>();
    if (!request.user) throw new ForbiddenException('Potreban je pristup osoblja.');
    const [user] = await this.db.select({ role: schema.users.role, status: schema.users.accountStatus, reset: schema.users.passwordResetRequired }).from(schema.users).where(eq(schema.users.id, request.user.id));
    if (!user || !['admin', 'moderator'].includes(user.role) || user.status !== 'active' || user.reset) throw new ForbiddenException('Potreban je pristup osoblja.');
    request.staffRole = user.role;
    return true;
  }
}
