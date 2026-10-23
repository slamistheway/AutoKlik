import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { dateInput, note, object, positiveId } from './admin-validation';
import { randomBytes } from 'crypto';
import { normalizeBlockValue } from '../auth/account-access';
import { deleteImage } from '../object-storage';

const { users, adminActions: actions, moderationReports: reports } = schema;
export type AdminTransaction = Parameters<Parameters<NodePgDatabase<typeof schema>['transaction']>[0]>[0];
export const staffUserFields = {
  id: users.id, username: users.username, email: users.email, firstName: users.firstName, lastName: users.lastName,
  phone: users.phone, city: users.city, country: users.country, role: users.role, accountStatus: users.accountStatus,
  restrictionReason: users.restrictionReason, passwordResetRequired: users.passwordResetRequired, sellerVerified: users.sellerVerified,
  badges: users.badges, dealerStatus: users.dealerStatus, dealerProfile: users.dealerProfile, moderationVersion: users.moderationVersion,
  dateCreated: sql<Date>`${users.dateCreated} at time zone current_setting('TimeZone')`.mapWith(actions.createdAt),
};

export function dealerProfile(value: unknown) {
  const input = object(value, ['businessName', 'registrationNumber', 'address', 'website']);
  const result = {} as { businessName: string; registrationNumber: string; address: string; website: string };
  for (const key of ['businessName', 'registrationNumber', 'address', 'website'] as const) {
    const value = input[key];
    if (typeof value !== 'string' || value.length > (key === 'website' ? 500 : 200) || /[\x00-\x1f\x7f]/.test(value) || (key !== 'website' && !value.trim())) throw new BadRequestException('Neispravni podaci trgovca.');
    result[key] = value.trim();
  }
  if (result.website) {
    try { const url = new URL(result.website); if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error(); }
    catch { throw new BadRequestException('Neispravna web adresa.'); }
  }
  return result;
}

export async function staffTarget(tx: AdminTransaction, actorId: number, targetId: number, adminOnly = false) {
  // Serialize staff account changes so two requests cannot remove the last active admin.
  await tx.execute(sql`select pg_advisory_xact_lock(714125)`);
  const rows = await tx.select(staffUserFields).from(users).where(inArray(users.id, [...new Set([actorId, targetId])])).orderBy(asc(users.id)).for('update');
  const actor = rows.find(user => user.id === actorId);
  const target = rows.find(user => user.id === targetId);
  if (!actor || actor.accountStatus !== 'active' || actor.passwordResetRequired || !['admin', 'moderator'].includes(actor.role) || (adminOnly && actor.role !== 'admin')) throw new ForbiddenException('Radnja nije dopuštena.');
  if (!target) throw new NotFoundException('Korisnik nije pronađen.');
  if (actorId === targetId || (actor.role === 'moderator' && ['admin', 'moderator'].includes(target.role))) throw new ForbiddenException('Ne možete mijenjati ovaj račun.');
  return { actor, target };
}

export async function auditUser(tx: AdminTransaction, actorId: number, targetId: number, action: string, reason: string, before: unknown, after: unknown) {
  await tx.insert(actions).values({ actorId, targetUserId: targetId, action, reason, before, after });
}

@Injectable()
export class UserAdminService {
  constructor(@Inject('DRIZZLE_DB') private readonly db: NodePgDatabase<typeof schema>) {}

  async list(query: Record<string, string>) {
    object(query, ['search', 'role', 'status', 'from', 'to', 'dealer', 'page']);
    if (Object.values(query).some(value => typeof value !== 'string' || value.length > 200)) throw new BadRequestException('Neispravni filtri.');
    const conditions: SQL[] = [];
    if (query.role) {
      if (!['user', 'dealer', 'moderator', 'admin'].includes(query.role)) throw new BadRequestException('Neispravna uloga.');
      conditions.push(eq(users.role, query.role as 'user' | 'dealer' | 'moderator' | 'admin'));
    }
    if (query.status) {
      if (!['active', 'suspended', 'banned', 'deleted'].includes(query.status)) throw new BadRequestException('Neispravan status.');
      conditions.push(eq(users.accountStatus, query.status as 'active' | 'suspended' | 'banned' | 'deleted'));
    }
    if (query.dealer) {
      if (!['none', 'pending', 'approved', 'rejected'].includes(query.dealer)) throw new BadRequestException('Neispravan status trgovca.');
      conditions.push(eq(users.dealerStatus, query.dealer as 'none' | 'pending' | 'approved' | 'rejected'));
    }
    if (query.from) conditions.push(sql`${users.dateCreated} >= ${dateInput(query.from).toISOString()}::timestamp`);
    if (query.to) conditions.push(sql`${users.dateCreated} < ${dateInput(query.to, true).toISOString()}::timestamp`);
    if (query.from && query.to && query.from > query.to) throw new BadRequestException('Neispravan raspon datuma.');
    if (query.search) {
      const term = `%${query.search.replace(/[\\%_]/g, '\\$&')}%`;
      conditions.push(or(ilike(users.username, term), ilike(users.email, term), ilike(users.firstName, term), ilike(users.lastName, term), sql`${users.id}::text = ${query.search}`)!);
    }
    const page = query.page ? positiveId(query.page) : 1;
    if (page > 100000) throw new BadRequestException('Neispravna stranica.');
    const [items, [count]] = await Promise.all([
      this.db.select(staffUserFields).from(users).where(and(...conditions)).orderBy(desc(users.id)).limit(25).offset((page - 1) * 25),
      this.db.select({ total: sql<number>`count(*)::int` }).from(users).where(and(...conditions)),
    ]);
    return { items, total: count.total, page, pageSize: 25 };
  }

  async detail(id: number) {
    const [user] = await this.db.select(staffUserFields).from(users).where(eq(users.id, id));
    if (!user) throw new NotFoundException('Korisnik nije pronađen.');
    const [counts, ads, reportHistory, loginHistory, decisions, sessions] = await Promise.all([
      this.db.execute(sql`select
        (select count(*)::int from ads where user_id = ${id}) as "ads",
        (select count(*)::int from messages where sender_id = ${id}) as "messagesSent",
        (select count(*)::int from moderation_reports where subject_user_id = ${id}) as "reportsAgainst",
        (select count(*)::int from moderation_reports where subject_user_id = ${id} and violation_confirmed) as "confirmedViolations",
        (select count(*)::int from admin_actions where target_user_id = ${id} and action in ('suspend', 'ban')) as "sanctions"`),
      this.db.select({ id: schema.ads.id, title: schema.ads.title, status: schema.ads.status }).from(schema.ads).where(eq(schema.ads.userId, id)).orderBy(desc(schema.ads.id)).limit(100),
      this.db.select().from(reports).where(eq(reports.subjectUserId, id)).orderBy(desc(reports.id)).limit(100),
      this.db.select({ action: schema.audit.action, ip: schema.audit.ip, createdAt: schema.audit.createdAt }).from(schema.audit).where(and(eq(schema.audit.userId, id), inArray(schema.audit.action, ['login', 'logout', 'login_failed']))).orderBy(desc(schema.audit.id)).limit(100),
      this.db.select().from(actions).where(eq(actions.targetUserId, id)).orderBy(desc(actions.id)).limit(100),
      this.db.select({ createdAt: schema.session.createdAt, expiresAt: schema.session.expiresAt, ip: schema.session.ipAddress, userAgent: schema.session.userAgent }).from(schema.session).where(eq(schema.session.userId, String(id))).orderBy(desc(schema.session.createdAt)).limit(100),
    ]);
    return { ...user, counts: counts.rows[0], ads, reports: reportHistory, loginHistory, decisions, sessions };
  }

  async change(actorId: number, id: number, value: unknown) {
    const body = object(value, ['action', 'reason', 'version', 'role', 'verified', 'badges', 'dealerStatus', 'dealerProfile']);
    const reason = note(body.reason);
    const allowed = ['suspend', 'reactivate', 'ban', 'unban', 'force_reset', 'role', 'verify', 'badges', 'dealer'];
    if (!allowed.includes(String(body.action))) throw new BadRequestException('Neispravna radnja.');
    await this.db.transaction(async tx => {
      const { target } = await staffTarget(tx, actorId, id, ['role', 'force_reset'].includes(String(body.action)));
      if (target.accountStatus === 'deleted') throw new BadRequestException('Račun je izbrisan.');
      if (body.version !== target.moderationVersion) throw new BadRequestException('Profil je promijenjen. Osvježite ga.');
      const changes: Partial<typeof users.$inferInsert> = { moderationVersion: target.moderationVersion + 1 };
      switch (body.action) {
        case 'suspend': changes.accountStatus = 'suspended'; changes.restrictionReason = reason; break;
        case 'ban': changes.accountStatus = 'banned'; changes.restrictionReason = reason; break;
        case 'reactivate':
          if (target.accountStatus !== 'suspended') throw new BadRequestException('Račun nije suspendiran.');
          changes.accountStatus = 'active'; changes.restrictionReason = null; break;
        case 'unban':
          if (target.accountStatus !== 'banned') throw new BadRequestException('Račun nije zabranjen.');
          changes.accountStatus = 'active'; changes.restrictionReason = null; break;
        case 'force_reset': changes.passwordResetRequired = true; break;
        case 'role':
          if (!['user', 'dealer', 'moderator', 'admin'].includes(String(body.role))) throw new BadRequestException('Neispravna uloga.');
          if (body.role === 'dealer' && target.dealerStatus !== 'approved') throw new BadRequestException('Najprije odobrite profil trgovca.');
          changes.role = body.role as typeof users.$inferInsert.role; break;
        case 'verify':
          if (typeof body.verified !== 'boolean') throw new BadRequestException('Neispravna potvrda.');
          changes.sellerVerified = body.verified; break;
        case 'badges':
          if (!Array.isArray(body.badges) || body.badges.length > 3 || body.badges.some(badge => !['trusted', 'professional', 'longstanding'].includes(badge))) throw new BadRequestException('Neispravne oznake.');
          changes.badges = [...new Set(body.badges)] as string[]; break;
        case 'dealer':
          if (!['pending', 'approved', 'rejected'].includes(String(body.dealerStatus))) throw new BadRequestException('Neispravan status trgovca.');
          changes.dealerProfile = dealerProfile(body.dealerProfile);
          changes.dealerStatus = body.dealerStatus as 'pending' | 'approved' | 'rejected';
          if (!['admin', 'moderator'].includes(target.role)) changes.role = changes.dealerStatus === 'approved' ? 'dealer' : 'user';
          break;
      }
      if (target.role === 'admin' && (changes.role && changes.role !== 'admin' || changes.accountStatus && changes.accountStatus !== 'active' || changes.passwordResetRequired)) {
        const [remaining] = await tx.select({ total: sql<number>`count(*)::int` }).from(users).where(and(eq(users.role, 'admin'), eq(users.accountStatus, 'active'), eq(users.passwordResetRequired, false), sql`${users.id} <> ${id}`));
        if (!remaining.total) throw new BadRequestException('Mora ostati barem jedan aktivan administrator.');
      }
      await tx.update(users).set(changes).where(eq(users.id, id));
      if (['suspend', 'ban', 'force_reset', 'role'].includes(String(body.action))) await tx.delete(schema.session).where(eq(schema.session.userId, String(id)));
      const [after] = await tx.select(staffUserFields).from(users).where(eq(users.id, id));
      await auditUser(tx, actorId, id, String(body.action), reason, target, after);
    });
    return this.detail(id);
  }

  async applyDealer(userId: number, value: unknown) {
    const profile = dealerProfile(value);
    await this.db.transaction(async tx => {
      const [user] = await tx.select({ id: users.id, version: users.moderationVersion }).from(users).where(eq(users.id, userId)).for('update');
      if (!user) throw new NotFoundException('Korisnik nije pronađen.');
      await tx.update(users).set({ dealerProfile: profile, dealerStatus: 'pending', moderationVersion: user.version + 1 }).where(eq(users.id, userId));
    });
    return { status: 'pending', message: 'Profil trgovca poslan je na odobrenje.' };
  }

  async myDealer(userId: number) {
    const [profile] = await this.db.select({ dealerProfile: users.dealerProfile, dealerStatus: users.dealerStatus }).from(users).where(eq(users.id, userId));
    return profile;
  }

  async erase(actorId: number, id: number, value: unknown) {
    const body = object(value, ['reason', 'confirmation', 'version']);
    const reason = note(body.reason);
    await this.db.transaction(async tx => {
      const { target } = await staffTarget(tx, actorId, id, true);
      if (target.accountStatus === 'deleted' || body.confirmation !== target.username || body.version !== target.moderationVersion) throw new BadRequestException('Provjerite potvrdu i osvježite profil.');
      if (target.role === 'admin') {
        const [remaining] = await tx.select({ total: sql<number>`count(*)::int` }).from(users).where(and(eq(users.role, 'admin'), eq(users.accountStatus, 'active'), eq(users.passwordResetRequired, false), sql`${users.id} <> ${id}`));
        if (!remaining.total) throw new BadRequestException('Mora ostati aktivan administrator.');
      }
      const owned = await tx.select({ id: schema.ads.id }).from(schema.ads).where(eq(schema.ads.userId, id));
      const adIds = owned.map(ad => ad.id);
      const photos = adIds.length ? await tx.select({ path: schema.adImages.imageUrl }).from(schema.adImages).where(inArray(schema.adImages.adId, adIds)) : [];
      const [avatar] = await tx.select({ path: users.pfp }).from(users).where(eq(users.id, id));
      const localFiles = [...photos.map(photo => photo.path), avatar?.path].filter((path): path is string => typeof path === 'string' && /^(ad-images|pfp)\/[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(path));
      if (localFiles.length) await tx.insert(schema.erasureFiles).values([...new Set(localFiles)].map(path => ({ path }))).onConflictDoNothing();
      const ownedActions = adIds.length ? await tx.select({ id: actions.id }).from(actions).where(inArray(actions.adId, adIds)) : [];
      const linkedReports = await tx.select({ id: reports.id }).from(reports).where(or(eq(reports.reporterId, id), eq(reports.subjectUserId, id)));
      const reportActions = linkedReports.length ? await tx.select({ id: actions.id }).from(actions).where(and(inArray(actions.action, ['resolve_report', 'escalate_report']), inArray(sql`(${actions.before}->>'id')::int`, linkedReports.map(report => report.id)))) : [];
      const authored = tx.select({ id: schema.messages.id }).from(schema.messages).where(eq(schema.messages.senderId, id));
      await tx.delete(schema.messageImages).where(inArray(schema.messageImages.messageId, authored));
      await tx.update(schema.messages).set({ body: '[Poruka je izbrisana]', encryptionVersion: 0 }).where(eq(schema.messages.senderId, id));
      await tx.delete(schema.savedAds).where(eq(schema.savedAds.userId, id));
      await tx.delete(schema.savedSearches).where(eq(schema.savedSearches.userId, id));
      await tx.delete(schema.adViews).where(eq(schema.adViews.viewerId, id));
      await tx.delete(schema.priceDropNotifications).where(eq(schema.priceDropNotifications.userId, id));
      await tx.delete(schema.usersAdDrafts).where(eq(schema.usersAdDrafts.userId, id));
      await tx.delete(schema.ads).where(eq(schema.ads.userId, id));
      await tx.delete(schema.verification).where(eq(schema.verification.value, String(id)));
      await tx.delete(schema.user).where(eq(schema.user.id, String(id)));
      await tx.update(schema.audit).set({ userId: null, ip: null }).where(eq(schema.audit.userId, id));
      await tx.update(schema.moderationReports).set({ reason: '[Podaci računa su izbrisani]', resolutionNote: null, reporterId: sql`case when ${reports.reporterId} = ${id} then null else ${reports.reporterId} end`, subjectUserId: sql`case when ${reports.subjectUserId} = ${id} then null else ${reports.subjectUserId} end` }).where(or(eq(reports.reporterId, id), eq(reports.subjectUserId, id), adIds.length ? and(eq(reports.targetType, 'ad'), inArray(reports.targetId, adIds)) : undefined));
      await tx.delete(schema.safetyAppeals).where(eq(schema.safetyAppeals.userId, id));
      const blocks = await tx.select({ id: schema.safetyBlocklist.id }).from(schema.safetyBlocklist).where(or(and(eq(schema.safetyBlocklist.kind, 'email'), eq(schema.safetyBlocklist.value, normalizeBlockValue('email', target.email))), and(eq(schema.safetyBlocklist.kind, 'phone'), eq(schema.safetyBlocklist.value, normalizeBlockValue('phone', target.phone ?? '')))));
      const blockIds = blocks.map(block => block.id);
      if (blockIds.length) {
        await tx.update(actions).set({ before: null, after: null, reason: '[Podaci računa su izbrisani]' }).where(and(eq(actions.action, 'blocklist_change'), inArray(sql`(${actions.after}->>'id')::int`, blockIds)));
        await tx.delete(schema.safetyBlocklist).where(inArray(schema.safetyBlocklist.id, blockIds));
      }
      const linkedActionIds = [...ownedActions, ...reportActions].map(action => action.id);
      await tx.update(actions).set({ before: null, after: null, reason: '[Podaci računa su izbrisani]' }).where(or(eq(actions.targetUserId, id), eq(actions.actorId, id), linkedActionIds.length ? inArray(actions.id, linkedActionIds) : undefined));
      await tx.update(users).set({ username: `deleted-${id}-${randomBytes(6).toString('hex')}`, email: `deleted-${randomBytes(16).toString('hex')}@deleted.invalid`, password: randomBytes(32).toString('hex'), pfp: null, firstName: null, lastName: null, phone: null, city: null, country: null, role: 'user', accountStatus: 'deleted', restrictionReason: null, passwordResetRequired: false, sellerVerified: false, badges: [], dealerStatus: 'none', dealerProfile: null, moderationVersion: target.moderationVersion + 1 }).where(eq(users.id, id));
      await auditUser(tx, actorId, id, 'account_erased', reason, null, { accountStatus: 'deleted', retainedAnonymousConversations: true });
    });
    const cleanup = await this.cleanupFiles(actorId);
    return { ...cleanup, message: 'Identitet, oglasi i vlastiti sadržaj poruka su izbrisani; poruke drugih sudionika su sačuvane.' + (cleanup.pending ? ` Preostaje ${cleanup.pending} datoteka za ponovnu obradu.` : '') };
  }

  async cleanupFiles(actorId: number) {
    const [actor] = await this.db.select({ role: users.role, status: users.accountStatus }).from(users).where(eq(users.id, actorId));
    if (!actor || actor.role !== 'admin' || actor.status !== 'active') throw new ForbiddenException('Samo administrator može dovršiti brisanje datoteka.');
    const queued = await this.db.select().from(schema.erasureFiles).limit(100);
    let removed = 0;
    for (const file of queued) {
      if (!/^(ad-images|pfp)\/[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(file.path)) continue;
      const [sharedPhoto] = await this.db.select({ id: schema.adImages.id }).from(schema.adImages).where(eq(schema.adImages.imageUrl, file.path)).limit(1);
      const [sharedAvatar] = await this.db.select({ id: users.id }).from(users).where(eq(users.pfp, file.path)).limit(1);
      try {
        if (!sharedPhoto && !sharedAvatar) {
          await deleteImage(file.path); removed++;
        }
        await this.db.delete(schema.erasureFiles).where(eq(schema.erasureFiles.path, file.path));
      } catch (cause) {
        if ((cause as NodeJS.ErrnoException).code === 'ENOENT') await this.db.delete(schema.erasureFiles).where(eq(schema.erasureFiles.path, file.path));
      }
    }
    const [pending] = await this.db.select({ total: sql<number>`count(*)::int` }).from(schema.erasureFiles);
    await this.db.insert(actions).values({ actorId, action: 'erasure_file_cleanup', reason: 'Brisanje neiskorištenih slika nakon brisanja računa', after: { removed, pending: pending.total } });
    return { removed, pending: pending.total };
  }
}
