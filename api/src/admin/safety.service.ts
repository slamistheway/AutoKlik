import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import * as bcrypt from 'bcrypt';
import { isIP } from 'net';
import { normalizeBlockValue } from '../auth/account-access';
import { note, object } from './admin-validation';
import { auditUser, staffTarget } from './user-admin.service';
import { decryptMessageContent, messageBodyContext } from '../users/message-crypto';

@Injectable()
export class SafetyService {
  constructor(@Inject('DRIZZLE_DB') private readonly db: NodePgDatabase<typeof schema>) {}

  async blocklist() { return this.db.select().from(schema.safetyBlocklist).orderBy(desc(schema.safetyBlocklist.id)).limit(200); }

  async block(actorId: number, value: unknown, actorIp: string | null = null) {
    const body = object(value, ['kind', 'value', 'reason', 'active']);
    const reason = note(body.reason);
    if (!['email', 'phone', 'ip'].includes(String(body.kind)) || typeof body.value !== 'string' || body.value.length > 255 || typeof body.active !== 'boolean') throw new BadRequestException('Neispravna blokada.');
    const normalized = normalizeBlockValue(String(body.kind), body.value);
    const active = body.active;
    if (active && body.kind === 'ip' && normalized === normalizeBlockValue('ip', actorIp ?? '')) throw new BadRequestException('Ne možete blokirati vlastitu trenutačnu IP adresu.');
    if (!normalized || (body.kind === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) || (body.kind === 'phone' && !/^\d{6,20}$/.test(normalized)) || (body.kind === 'ip' && !isIP(normalized))) throw new BadRequestException('Neispravna vrijednost blokade.');
    await this.db.transaction(async tx => {
      const [actor] = await tx.select({ role: schema.users.role, status: schema.users.accountStatus, email: schema.users.email, phone: schema.users.phone }).from(schema.users).where(eq(schema.users.id, actorId));
      if (!actor || actor.role !== 'admin' || actor.status !== 'active') throw new ForbiddenException('Samo administrator može mijenjati blokade.');
      if (body.active && ((body.kind === 'email' && normalized === normalizeBlockValue('email', actor.email)) || (body.kind === 'phone' && normalized === normalizeBlockValue('phone', actor.phone ?? '')))) throw new BadRequestException('Ne možete blokirati vlastiti račun.');
      const [before] = await tx.select().from(schema.safetyBlocklist).where(and(eq(schema.safetyBlocklist.kind, body.kind as 'email' | 'phone' | 'ip'), eq(schema.safetyBlocklist.value, normalized)));
      const [after] = await tx.insert(schema.safetyBlocklist).values({ kind: body.kind as 'email' | 'phone' | 'ip', value: normalized, reason, active, createdBy: actorId })
        .onConflictDoUpdate({ target: [schema.safetyBlocklist.kind, schema.safetyBlocklist.value], set: { reason, active } }).returning();
      await tx.insert(schema.adminActions).values({ actorId, action: 'blocklist_change', reason, before: before ?? null, after });
    });
    return { success: true };
  }

  async appeals() {
    return this.db.select({ appeal: schema.safetyAppeals, username: schema.users.username, accountStatus: schema.users.accountStatus }).from(schema.safetyAppeals).innerJoin(schema.users, eq(schema.users.id, schema.safetyAppeals.userId)).orderBy(desc(schema.safetyAppeals.id)).limit(100);
  }

  async submitAppeal(value: unknown) {
    const body = object(value, ['identifier', 'password', 'reason']);
    const reason = note(body.reason);
    if (typeof body.identifier !== 'string' || !body.identifier.trim() || body.identifier.length > 255 || typeof body.password !== 'string' || !body.password || Buffer.byteLength(body.password) > 72) throw new UnauthorizedException('Neispravni podaci.');
    const identifier = body.identifier.trim();
    const [user] = await this.db.select({ id: schema.users.id, password: schema.users.password, status: schema.users.accountStatus }).from(schema.users)
      .where(identifier.includes('@') ? eq(schema.users.email, identifier.toLowerCase()) : eq(schema.users.username, identifier));
    if (!user || !(await bcrypt.compare(body.password, user.password))) throw new UnauthorizedException('Neispravni podaci.');
    if (!['suspended', 'banned'].includes(user.status)) throw new BadRequestException('Žalba je dostupna suspendiranim i zabranjenim računima.');
    const [appeal] = await this.db.insert(schema.safetyAppeals).values({ userId: user.id, reason }).onConflictDoNothing().returning({ id: schema.safetyAppeals.id });
    return { message: appeal ? 'Žalba je zaprimljena.' : 'Već imate otvorenu žalbu.' };
  }

  async resolveAppeal(actorId: number, id: number, value: unknown) {
    const body = object(value, ['status', 'reason']);
    const reason = note(body.reason);
    if (!['accepted', 'rejected'].includes(String(body.status))) throw new BadRequestException('Neispravna odluka.');
    await this.db.transaction(async tx => {
      const [appeal] = await tx.select().from(schema.safetyAppeals).where(eq(schema.safetyAppeals.id, id)).for('update');
      if (!appeal || appeal.status !== 'open') throw new BadRequestException('Žalba nije otvorena.');
      const { target } = await staffTarget(tx, actorId, appeal.userId, true);
      if (body.status === 'accepted') {
        if (!['suspended', 'banned'].includes(target.accountStatus)) throw new BadRequestException('Račun više nije ograničen.');
        await tx.update(schema.users).set({ accountStatus: 'active', restrictionReason: null, moderationVersion: target.moderationVersion + 1 }).where(eq(schema.users.id, target.id));
      }
      const [after] = await tx.update(schema.safetyAppeals).set({ status: body.status as 'accepted' | 'rejected', resolutionNote: reason, resolvedAt: new Date() }).where(eq(schema.safetyAppeals.id, id)).returning();
      await auditUser(tx, actorId, target.id, 'appeal_' + body.status, reason, { appeal, accountStatus: target.accountStatus }, { appeal: after, accountStatus: body.status === 'accepted' ? 'active' : target.accountStatus });
    });
    return { success: true };
  }

  async reviewMessage(actorId: number, reportId: number, value: unknown) {
    const reason = note(object(value, ['reason']).reason);
    return this.db.transaction(async tx => {
      const [report] = await tx.select().from(schema.moderationReports).where(and(eq(schema.moderationReports.id, reportId), eq(schema.moderationReports.targetType, 'message'))).for('share');
      if (!report) throw new NotFoundException('Ne postoji prijava poruke.');
      const [message] = await tx.select().from(schema.messages).where(eq(schema.messages.id, report.targetId));
      if (!message) throw new NotFoundException('Poruka je izbrisana.');
      // Save access evidence before returning plaintext. Never include plaintext in audit snapshots.
      await tx.insert(schema.adminActions).values({ actorId, targetUserId: report.subjectUserId, action: 'reported_message_access', reason, after: { reportId, messageId: message.id } });
      if (message.encryptionVersion !== 0 && message.encryptionVersion !== 1) throw new BadRequestException('Nepodržan format poruke.');
      return { id: message.id, senderId: message.senderId, createdAt: message.createdAt, body: message.encryptionVersion === 1 ? decryptMessageContent(message.body, messageBodyContext(message.conversationId, message.senderId)).toString('utf8') : message.body };
    });
  }

  async repeatOffenders() {
    const result = await this.db.execute(sql`select u.id, u.username, u.account_status as "accountStatus",
      count(r.id)::int as "confirmedViolations", max(r.resolved_at) as "lastViolation"
      from users u join moderation_reports r on r.subject_user_id = u.id and r.violation_confirmed
      group by u.id having count(r.id) >= 2 order by count(r.id) desc, u.id limit 100`);
    return result.rows.map(row => ({ ...row, id: Number(row.id) }));
  }
}
