require('dotenv').config({ quiet: true });
require('reflect-metadata');
require('ts-node').register({ transpileOnly: true, preferTsExts: true });
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');
const { sql } = require('drizzle-orm');
const { generateDrizzleJson, generateMigration } = require('drizzle-kit/api');
const fs = require('node:fs');
const { Test } = require('@nestjs/testing');
const { AdminModule } = require('../src/admin/admin.module');
const { AdminService } = require('../src/admin/admin.service');
const { AdsService } = require('../src/ads/ads.service');
const { UserAdminService } = require('../src/admin/user-admin.service');
const { SafetyService } = require('../src/admin/safety.service');
// Fixtures must never unlink real files from the application's upload directory.
UserAdminService.prototype.cleanupFiles = async () => ({ removed: 0, pending: 0 });
const { BetterAuthService } = require('../src/auth/better-auth.service');
const { accountRestriction, assertNotBlocked } = require('../src/auth/account-access');
const bcrypt = require('bcrypt');
const { SessionAuthGuard } = require('../src/auth/session-auth.guard');
const { InputValidationPipe } = require('../src/input-validation');

async function main() {
  const target = new URL(process.env.DATABASE_URL);
  assert(['localhost', '127.0.0.1', '[::1]'].includes(target.hostname), 'Local development database only');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const namespace = `admin_check_${Date.now()}`;
  const rollback = new Error('Roll back isolated admin verification');
  let app;
  try {
    try {
      await drizzle(client).transaction(async tx => {
        await tx.execute(sql.raw(`create schema "${namespace}"`));
        await tx.execute(sql.raw(`set local search_path to "${namespace}"`));
        // Verify both migrations against the previous schema without altering application tables.
        const baseline = require('../drizzle/meta/0015_snapshot.json');
        const ddl = await generateMigration(generateDrizzleJson({}), baseline);
        for (const statement of [...ddl, fs.readFileSync('drizzle/0016_admin_moderation.sql', 'utf8'), fs.readFileSync('drizzle/0017_admin_indexes.sql', 'utf8'), fs.readFileSync('drizzle/0018_user_management_safety.sql', 'utf8'), fs.readFileSync('drizzle/0019_erasure_file_cleanup.sql', 'utf8'), fs.readFileSync('drizzle/0020_user_blocks.sql', 'utf8'), fs.readFileSync('drizzle/0021_complete_search.sql', 'utf8')]) {
          await tx.execute(sql.raw(statement.replaceAll('"public".', `"${namespace}".`)));
        }
        const users = (await client.query("insert into users(username,email,password,role) values ('staff','staff@example.test','x','admin'),('mod','mod@example.test','x','moderator'),('seller','seller@example.test','x','user'),('reporter','reporter@example.test','x','user') returning id")).rows.map(row => Number(row.id));
        const [admin, mod, seller, reporter] = users;
        const ids = (await client.query("insert into ads(user_id,title,brand,model,category,subcategory,price,vin) values ($1,'Ad A','BMW','320d','car','car',10000,'WBA12345678901234'),($1,'Ad B','BMW','320d','car','car',12000,'WBA12345678901234') returning id", [seller])).rows.map(row => row.id);
        await client.query("insert into ad_images(ad_id,image_url,sha256) values ($1,'ad-images/first.jpg',$3),($2,'ad-images/copy.jpg',$3)", [...ids, 'a'.repeat(64)]);
        const service = new AdminService(tx);
        const ads = new AdsService(tx);
        const module = await Test.createTestingModule({ imports: [AdminModule] })
          .overrideProvider('DRIZZLE_DB').useValue(tx)
          .overrideGuard(SessionAuthGuard).useValue({ canActivate(context) {
            const req = context.switchToHttp().getRequest();
            const id = Number(req.headers.authorization?.replace('Bearer ', ''));
            if (!users.includes(id)) return false;
            req.user = { id };
            return true;
          } }).compile();
        app = module.createNestApplication({ logger: false });
        if (process.argv.includes('--ui')) {
          app.enableCors({ origin: 'http://localhost:3003' });
          app.use('/users/login', (_req, response) => response.json({ token: String(admin) }));
          app.use('/users/logout', (_req, response) => response.json({ success: true }));
        }
        app.useGlobalPipes(new InputValidationPipe());
        await app.listen(process.argv.includes('--ui') ? 3012 : 0, '127.0.0.1');
        const root = await app.getUrl();
        const call = async (actor, path, method = 'GET', body) => {
          const result = await fetch(root + path, { method, headers: { Authorization: `Bearer ${actor}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
          return { status: result.status, body: await result.json() };
        };
        for (const path of ['/admin/me', '/admin/ads', '/admin/dashboard', '/admin/activity', '/admin/reports', `/admin/ads/${ids[0]}`]) assert.equal((await call(seller, path)).status, 403);
        assert.equal((await call(seller, '/admin/ads/moderate', 'POST', { ids, decision: 'remove', reason: 'Not staff' })).status, 403);
        assert.equal((await call(mod, '/admin/me')).status, 200);
        assert.equal((await call(admin, '/admin/ads?search=WBA12345678901234')).body.total, 2);
        assert.equal((await call(admin, '/admin/ads?from=2026-02-30')).status, 400);
        assert.equal((await call(admin, '/admin/ads?search=x&search=y')).status, 400);
        // Sitemaps must not inherit the 30-ad public listing cap or expose private records.
        await client.query("insert into ads(user_id,title,status,expires_at) select $1,'Sitemap fixture '||n,'active',now()+interval '1 day' from generate_series(1,35) n", [seller]);
        await client.query("insert into ads(user_id,title,status,expires_at) values ($1,'Sitemap fixture hidden','hidden',now()+interval '1 day'),($1,'Sitemap fixture sold','sold',now()+interval '1 day'),($1,'Sitemap fixture expired','active',now()-interval '1 day'),($2,'Sitemap fixture restricted seller','active',now()+interval '1 day')", [seller, mod]);
        await client.query("update users set account_status='suspended' where id=$1", [mod]);
        const sitemapAds = await ads.sitemap({ kind: 'ads', page: '1' });
        assert.equal(sitemapAds.items.length, 37);
        assert.equal(Object.keys(sitemapAds.items[0]).sort().join(','), 'id,lastModified,title');
        assert(!sitemapAds.items.some(ad => /hidden|sold|expired|restricted seller/.test(ad.title ?? '')));
        assert.equal((await ads.sitemap({ kind: 'counts' })).ads, 37);
        assert.equal((await ads.sitemap({ kind: 'sellers' })).items.length, 1);
        assert.equal((await ads.sitemap({ kind: 'ads', page: '2' })).items.length, 0);
        await assert.rejects(ads.sitemap({ kind: 'ads', page: '-1' }), error => error.status === 400);
        await assert.rejects(ads.sitemap({ kind: 'ads', token: 'secret' }), error => error.status === 400);
        await client.query("delete from ads where title like 'Sitemap fixture %'");
        await client.query("update users set account_status='active' where id=$1", [mod]);
        const before = await service.detail(ids[0]);
        assert(Math.abs(before.dateCreated.getTime() - Date.now()) < 120000, 'Creation timestamps must respect the database timezone');
        assert.equal(before.duplicates.matches[0].sameVin, true);
        assert.equal(before.duplicates.matches[0].samePhoto, true);
        await service.moderate(admin, { ids, decision: 'remove', reason: 'Scam review' });
        await assert.rejects(ads.updateStatus(ids[0], seller, 'active'), error => error.status === 404);
        assert.equal((await ads.findAllAds()).length, 0);
        await assert.rejects(service.moderate(admin, { ids: [ids[0], 999999], decision: 'restore', reason: 'Rollback check' }), error => error.status === 404);
        assert.equal((await service.detail(ids[0])).effectiveStatus, 'removed');
        await service.moderate(mod, { ids: [ids[0]], decision: 'restore', reason: 'Verified seller' });
        const restored = await service.detail(ids[0]);
        assert.equal(restored.effectiveStatus, 'active');
        const edited = await service.edit(admin, ids[0], { fields: { title: 'Corrected', featured: true, pinned: true, price: 9000 }, reason: 'Correct description', version: restored.dateLastUpdated.toISOString() });
        assert.equal(edited.pinned, true);
        assert.equal(edited.featured, true);
        await assert.rejects(service.edit(admin, ids[0], { fields: { title: 'Stale' }, reason: 'Outdated editor', version: before.dateLastUpdated.toISOString() }), error => error.status === 400);
        await assert.rejects(service.removePhoto(mod, ids[0], (await service.detail(ids[1])).photos[0].id, { reason: 'Wrong ad', version: edited.dateLastUpdated.toISOString() }), error => error.status === 404);
        const noPhoto = await service.removePhoto(mod, ids[0], edited.photos[0].id, { reason: 'Photo violates rules', version: edited.dateLastUpdated.toISOString() });
        assert.equal(noPhoto.photos.length, 0);
        assert(noPhoto.decisions.some(item => item.action === 'remove_photo' && item.before && item.after));
        const report = await service.submitReport(reporter, { targetType: 'ad', targetId: ids[0], reason: 'Suspicious listing' });
        assert.equal((await service.dashboard('day')).queues.openReports, 1);
        await service.resolveReport(mod, report.id, { status: 'resolved', reason: 'Reviewed evidence' });
        assert.equal((await service.listReports()).length, 0);
        assert.equal((await service.listReports(undefined, 'resolved')).length, 1);
        const conversation = (await client.query('insert into conversations(user_a_id,user_b_id) values ($1,$2) returning id', [seller, reporter])).rows[0].id;
        const message = (await client.query("insert into messages(conversation_id,sender_id,body) values ($1,$2,'Test message') returning id", [conversation, seller])).rows[0].id;
        await assert.rejects(service.submitReport(admin, { targetType: 'message', targetId: Number(message), reason: 'Not a participant' }), error => error.status === 404);
        const flagged = await service.submitReport(reporter, { targetType: 'message', targetId: Number(message), reason: 'Scam link' });
        assert.equal((await service.dashboard('day')).queues.flaggedMessages, 1);
        await service.resolveReport(mod, flagged.id, { status: 'dismissed', reason: 'Safe message' });
        for (const period of ['day', 'week', 'month']) {
          const dashboard = await service.dashboard(period);
          assert.equal(dashboard.chart.length, period === 'day' ? 24 : period === 'week' ? 7 : 30);
          assert.equal(dashboard.stats.newAds, 2);
          assert.equal(dashboard.queues.openReports, 0);
        }
        await ads.updateStatus(ids[0], seller, 'sold');
        assert.equal((await service.dashboard('day')).stats.soldAds, 1);
        assert.equal((await call(admin, '/admin/ads/moderate', 'POST', { ids, decision: 'remove', reason: '' })).status, 400);

        const userAdmin = new UserAdminService(tx);
        const safety = new SafetyService(tx);
        assert.equal((await userAdmin.list({ search: 'seller', role: 'user' })).total, 1);
        let profile = await userAdmin.detail(seller);
        assert(!JSON.stringify(profile).includes('password":"x'), 'Never expose passwords');
        assert.equal((await call(mod, '/admin/users/'+seller, 'PATCH', { action: 'role', role: 'admin', reason: 'No permission', version: profile.moderationVersion })).status, 403);
        const sessionUser = String(seller);
        await client.query('insert into "user"(id,name,email) values ($1,$2,$3)', [sessionUser, 'seller', 'seller@example.test']);
        await client.query('insert into session(id,token,updated_at,expires_at,user_id) values ($1,$2,now(),now()+interval \'1 day\',$3)', ['fixture-session', 'fixture-session-token', sessionUser]);
        const auth = new BetterAuthService(tx, { recordLogout: async () => undefined });
        auth.getAuth = async () => ({ api: { getSession: async () => {
          const session = (await client.query('select id from session where token=$1', ['fixture-session-token'])).rows[0];
          return session ? { user: { id: sessionUser }, session } : null;
        }, signInEmail: async () => {
          await client.query("insert into session(id,token,updated_at,expires_at,user_id) values ('fixture-session','fixture-session-token',now(),now()+interval '1 day',$1)", [sessionUser]);
          return { token: 'fixture-session-token' };
        } } });
        const fakeRequest = { headers: {}, ip: '198.51.100.24', socket: {} };
        assert.equal((await auth.authenticate(fakeRequest)).id, seller);
        await userAdmin.change(mod, seller, { action: 'suspend', reason: 'Safety review', version: profile.moderationVersion });
        assert.equal(await auth.authenticate(fakeRequest), null);
        const restrictedUser = (await tx.execute(sql.raw('select * from users where id = ' + seller))).rows[0];
        await assert.rejects(auth.signIn(restrictedUser, 'fixture', '198.51.100.24'), error => error.status === 403);
        await client.query("insert into session(id,token,updated_at,expires_at,user_id) values ('replayed-session','fixture-session-token',now(),now()+interval '1 day',$1)", [sessionUser]);
        assert.equal(await auth.authenticate(fakeRequest), null, 'Account restrictions must reject even an otherwise valid session');
        await client.query('delete from session where user_id=$1', [sessionUser]);
        assert.equal((await client.query('select count(*)::int as n from session where user_id=$1', [sessionUser])).rows[0].n, 0);
        assert.equal((await ads.findAllAds()).length, 0);
        profile = await userAdmin.detail(seller);
        await userAdmin.change(mod, seller, { action: 'reactivate', reason: 'Verified', version: profile.moderationVersion });
        profile = await userAdmin.detail(seller);
        await userAdmin.change(admin, seller, { action: 'force_reset', reason: 'Credential safety', version: profile.moderationVersion });
        assert(accountRestriction((await client.query('select account_status as "accountStatus", password_reset_required as "passwordResetRequired" from users where id=$1', [seller])).rows[0]));
        await client.query('update users set password_reset_required=false where id=$1', [seller]);
        profile = await userAdmin.detail(seller);
        await userAdmin.applyDealer(seller, { businessName: 'Fixture dealer', registrationNumber: 'TEST-123', address: 'Fixture address', website: 'https://example.test' });
        profile = await userAdmin.detail(seller);
        await userAdmin.change(mod, seller, { action: 'dealer', dealerStatus: 'approved', dealerProfile: profile.dealerProfile, reason: 'Business checked', version: profile.moderationVersion });
        assert.equal((await userAdmin.detail(seller)).role, 'dealer');
        await safety.block(admin, { kind: 'email', value: ' SELLER@example.test ', reason: 'Safety block', active: true });
        await assert.rejects(assertNotBlocked(tx, { email: 'seller@example.test' }, null), error => error.status === 403);
        await safety.block(admin, { kind: 'email', value: 'seller@example.test', reason: 'Cleared', active: false });
        await assertNotBlocked(tx, { email: 'seller@example.test' }, null);
        await assert.rejects(safety.block(mod, { kind: 'phone', value: '+385 91 1234567', reason: 'No authority', active: true }), error => error.status === 403);
        await safety.block(admin, { kind: 'ip', value: '198.51.100.24', reason: 'IP safety', active: true });
        await assert.rejects(assertNotBlocked(tx, {}, '::ffff:198.51.100.24'), error => error.status === 403);
        await safety.block(admin, { kind: 'ip', value: '198.51.100.24', reason: 'Cleared', active: false });
        const targetReport = await service.submitReport(reporter, { targetType: 'user', targetId: seller, reason: 'Account report' });
        await service.resolveReport(mod, targetReport.id, { status: 'escalated', reason: 'Needs admin' });
        assert.equal((await service.listReports(undefined, 'pending')).filter(report => report.id === targetReport.id).length, 1);
        await assert.rejects(service.resolveReport(mod, targetReport.id, { status: 'resolved', reason: 'Cannot resolve' }), error => error.status === 400);
        await service.resolveReport(admin, targetReport.id, { status: 'resolved', reason: 'Confirmed violation', violationConfirmed: true });
        const secondReport = await service.submitReport(reporter, { targetType: 'user', targetId: seller, reason: 'Another violation' });
        await service.resolveReport(admin, secondReport.id, { status: 'resolved', reason: 'Confirmed repeated violation', violationConfirmed: true });
        assert((await safety.repeatOffenders()).some(user => user.id === seller));
        const review = await safety.reviewMessage(admin, flagged.id, { reason: 'Review reported message' });
        assert.equal(review.body, 'Test message');
        assert.equal((await client.query("select count(*)::int as n from admin_actions where action='reported_message_access'")).rows[0].n, 1);
        await assert.rejects(safety.reviewMessage(admin, targetReport.id, { reason: 'Not a message report' }), error => error.status === 404);
        profile = await userAdmin.detail(seller);
        await userAdmin.change(admin, seller, { action: 'ban', reason: 'Repeated violation', version: profile.moderationVersion });
        await client.query('update users set password=$1 where id=$2', [await bcrypt.hash('FixturePass!123', 4), seller]);
        const appeal = await safety.submitAppeal({ identifier: 'seller', password: 'FixturePass!123', reason: 'Please reconsider' });
        assert(appeal.message.includes('zaprimljena'));
        const appealRow = (await safety.appeals())[0].appeal;
        await safety.resolveAppeal(admin, appealRow.id, { status: 'accepted', reason: 'Appeal accepted after review' });
        assert.equal((await userAdmin.detail(seller)).accountStatus, 'active');
        // Deletion preserves the other participant's message; no real files are touched by this fixture.
        process.env.MESSAGE_ENCRYPTION_KEY = '1'.repeat(64);
        const { UsersService } = require('../src/users/users.service');
        const messaging = new UsersService(tx, null, null, null);
        const suspicious = await messaging.sendMessage(seller, Number(conversation), 'Send your password via https://bit.ly/verify');
        const auto = (await service.listReports('message')).find(report => report.targetId === suspicious.id);
        assert(auto && auto.source === 'automated' && auto.signals.includes('credential_request'));
        assert.equal((await safety.reviewMessage(admin, auto.id, { reason: 'Verify automated signal' })).body, suspicious.body);
        const retained = (await client.query("insert into messages(conversation_id,sender_id,body) values ($1,$2,'Other participant text') returning id", [conversation, reporter])).rows[0].id;
        profile = await userAdmin.detail(seller);
        userAdmin.cleanupFiles = async () => ({ removed: 0, pending: 0 });
        await assert.rejects(userAdmin.erase(mod, seller, { confirmation: 'seller', reason: 'Not admin', version: profile.moderationVersion }), error => error.status === 403);
        await assert.rejects(userAdmin.erase(admin, seller, { confirmation: 'wrong', reason: 'Wrong confirmation', version: profile.moderationVersion }), error => error.status === 400);
        await userAdmin.erase(admin, seller, { confirmation: 'seller', reason: 'Fixture erasure request', version: profile.moderationVersion });
        const erased = await userAdmin.detail(seller);
        assert.equal(erased.accountStatus, 'deleted');
        await assert.rejects(messaging.addConversation(reporter, seller), error => error.status === 404);
        await assert.rejects(messaging.sendMessage(reporter, Number(conversation), 'Cannot send after erasure'), error => error.status === 404);
        assert.notEqual(erased.email, 'seller@example.test');
        assert.equal(erased.phone, null);
        assert.equal((await client.query('select body from messages where id=$1', [retained])).rows[0].body, 'Other participant text');
        assert.equal((await client.query('select body from messages where id=$1', [message])).rows[0].body, '[Poruka je izbrisana]');
        assert.equal((await client.query('select count(*)::int as n from "user" where id=$1', [sessionUser])).rows[0].n, 0);
        assert.equal((await userAdmin.list({ status: 'deleted' })).total, 1);

        await client.query("update users set role='user' where id=$1", [mod]);
        assert.equal((await call(mod, '/admin/me')).status, 403);
        if (process.argv.includes('--ui')) {
          await client.query("insert into users(username,email,password) values ('uiSeller','ui-seller@example.test','fixture-only')");
          console.log('UI_FIXTURE_READY: isolated API on 127.0.0.1:3012; test-only login accepts fixture credentials. Send a line to roll back.');
          await new Promise(resolve => {
            const timeout = setTimeout(resolve, 120000);
            process.stdin.once('data', () => { clearTimeout(timeout); resolve(); });
          });
        }
        await app.close(); app = null;
        throw rollback;
      });
    } catch (error) { if (error !== rollback) throw error; }
    assert.equal((await client.query('select to_regnamespace($1) as name', [namespace])).rows[0].name, null);
    console.log('PASS: dashboard/ad moderation plus user filters, staff permissions, suspension/session revocation, reset requirements, dealer approval, normalized blocklists, escalation, confirmed repeat violations, encrypted scam detection, logged report-gated message access, appeals and identity/message erasure preserving other participants. Isolated schema and fixtures rolled back; no real upload files touched.');
  } finally { if (app) await app.close(); await client.end(); }
}

main().catch(error => { console.error(error.stack ?? error.message); process.exitCode = 1; });
