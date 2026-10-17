import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { assertEmailConfigured } from './password-reset-email';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import type { Request } from 'express';
import { randomUUID } from 'crypto';
import * as schema from '../db/schema';
import { AuditService } from '../audit/audit.service';
import { accountRestriction, assertNotBlocked } from './account-access';

type AppUser = Pick<
  typeof schema.users.$inferSelect,
  'id' | 'username' | 'email' | 'password' | 'pfp'
>;

@Injectable()
export class BetterAuthService {
  private readonly logger = new Logger(BetterAuthService.name);
  private authPromise?: Promise<typeof import('../../utils/auth').auth>;

  constructor(
    @Inject('DRIZZLE_DB') private readonly db: NodePgDatabase<typeof schema>,
    private readonly audit: AuditService,
  ) {}

  private getAuth() {
    return (this.authPromise ??= import('../../utils/auth.js').then(
      (module) => module.auth,
    ));
  }

  async createIdentity(
    user: AppUser,
    database: Pick<NodePgDatabase<typeof schema>, 'insert'>,
  ) {
    const id = String(user.id);
    await database
      .insert(schema.user)
      .values({ id, name: user.username, email: user.email, image: user.pfp });
    await database.insert(schema.account).values({
      id: randomUUID(),
      userId: id,
      accountId: id,
      providerId: 'credential',
      password: user.password,
    });
  }

  private async ensureIdentity(user: AppUser) {
    const [identity] = await this.db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.id, String(user.id)))
      .limit(1);
    if (!identity) {
      // Serialize first login imports across concurrent requests.
      await this.db.transaction(async (tx) => {
        await tx
          .select({ id: schema.users.id })
          .from(schema.users)
          .where(eq(schema.users.id, user.id))
          .for('update');
        const [existing] = await tx
          .select({ id: schema.user.id })
          .from(schema.user)
          .where(eq(schema.user.id, String(user.id)))
          .limit(1);
        if (!existing) await this.createIdentity(user, tx);
      });
    }
  }

  async signIn(user: AppUser, password: string, ip: string | null) {
    const auth = await this.getAuth();
    await this.ensureIdentity(user);
    const session = await auth.api.signInEmail({
      body: { email: user.email, password },
      headers: new Headers(ip ? { 'x-forwarded-for': ip } : {}),
    });
    try {
      const [fresh] = await this.db.select().from(schema.users).where(eq(schema.users.id, user.id));
      const restriction = fresh ? accountRestriction(fresh) : 'Račun nije dostupan.';
      if (restriction) throw new ForbiddenException(restriction);
      await assertNotBlocked(this.db, fresh!, ip);
      return session;
    } catch (error) {
      await this.db.delete(schema.session).where(eq(schema.session.token, session.token));
      throw error;
    }
  }

  async forgotPassword(email: string) {
    try {
      assertEmailConfigured();
    } catch {
      throw new ServiceUnavailableException(
        'Slanje emaila trenutno nije dostupno. Pokušajte kasnije.',
      );
    }
    const normalizedEmail = email.trim().toLowerCase();
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, normalizedEmail))
      .limit(1);
    if (user) await this.ensureIdentity(user);
    const auth = await this.getAuth();
    try {
      await auth.api.requestPasswordReset({
        body: {
          email: normalizedEmail,
          redirectTo: new URL(
            '/reset-password',
            process.env.FRONTEND_URL ?? 'http://localhost:3000',
          ).toString(),
        },
      });
    } catch {
      this.logger.error(
        'Password-reset email request failed. Check email provider configuration.',
      );
    }
    return {
      message:
        'Ako postoji račun s tom email adresom, poslana je poveznica za promjenu lozinke.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    if (Buffer.byteLength(newPassword, 'utf8') > 72)
      throw new BadRequestException('Lozinka je preduga.');
    const auth = await this.getAuth();
    try {
      await auth.api.resetPassword({ body: { token, newPassword } });
    } catch {
      throw new BadRequestException(
        'Poveznica je neispravna ili je istekla. Zatražite novu poveznicu.',
      );
    }
    return { message: 'Lozinka je promijenjena. Prijavite se novom lozinkom.' };
  }

  async authenticate(request: Request) {
    const auth = await this.getAuth();
    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) {
      if (value)
        headers.set(key, Array.isArray(value) ? value.join(', ') : value);
    }
    const result = await auth.api.getSession({
      headers,
      query: { disableCookieCache: true },
    });
    if (!result) return null;
    const id = Number(result.user.id);
    if (!Number.isSafeInteger(id) || id <= 0) return null;
    const [user] = await this.db
      .select({ id: schema.users.id, email: schema.users.email, phone: schema.users.phone, accountStatus: schema.users.accountStatus, passwordResetRequired: schema.users.passwordResetRequired })
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);
    if (!user || accountRestriction(user)) return null;
    await assertNotBlocked(this.db, user, request.ip ?? request.socket?.remoteAddress ?? null);
    return { id: user.id, email: user.email, sessionId: result.session.id };
  }

  async logout(
    request: Request & { user?: { id: number; sessionId: string } },
  ) {
    if (!request.user) throw new UnauthorizedException();
    const auth = await this.getAuth();
    const headers = new Headers();
    if (request.headers.authorization)
      headers.set('authorization', request.headers.authorization);
    if (request.headers.cookie) headers.set('cookie', request.headers.cookie);
    await auth.api.signOut({ headers });
    await this.audit.recordLogout(
      request.user.id,
      request.ip ?? request.socket.remoteAddress ?? null,
    );
    return { message: 'Odjava uspješna.' };
  }
}
