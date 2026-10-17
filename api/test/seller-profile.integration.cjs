require('dotenv').config({ quiet: true });
require('reflect-metadata');
require('ts-node').register({ transpileOnly: true });
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');
const { AdsService } = require('../src/ads/ads.service');

async function check() {
  const target = new URL(process.env.DATABASE_URL);
  assert(['localhost', '127.0.0.1', '[::1]'].includes(target.hostname), 'Run only against the local development database');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const db = drizzle(client);
  const marker = `viewrollback${Date.now()}`;
  const rollback = new Error('Rollback integration fixtures');
  try {
    try {
      await db.transaction(async tx => {
        const owner = Number((await client.query('select id from users order by id limit 1')).rows[0].id);
        const viewers = (await client.query(
          "insert into users(username,email,password) values ($1::varchar,$1::text||'@example.test','not-a-login'),($2::varchar,$2::text||'@example.test','not-a-login') returning id",
          [marker + 'A', marker + 'B'],
        )).rows.map(row => Number(row.id));
        const ids = (await client.query(
          "insert into ads(user_id,title,status,expires_at) values ($1,$2,'active',now()+interval '3 days'),($1,$2,'hidden',now()+interval '3 days'),($1,$2,'sold',now()+interval '3 days'),($1,$2,'active',now()-interval '1 second') returning id",
          [owner, marker],
        )).rows.map(row => row.id);
        // Pass the Drizzle transaction itself so service transactions use savepoints.
        const service = new AdsService(tx);
        assert.deepEqual(await service.recordView(ids[0], owner), { viewCount: 0, counted: false });
        assert.deepEqual(await service.recordView(ids[0], viewers[0]), { viewCount: 1, counted: true });
        assert.deepEqual(await service.recordView(ids[0], viewers[0]), { viewCount: 1, counted: false });
        assert.deepEqual(await service.recordView(ids[0], viewers[1]), { viewCount: 2, counted: true });
        await assert.rejects(service.recordView(ids[1], viewers[0]), error => error.status === 404);
        assert.equal((await service.findOne(ids[0])).view_count, 2);
        assert.equal((await service.findOne(ids[0])).view_count, 2);
        const profile = await service.findSellerProfile(owner);
        assert.deepEqual(Object.keys(profile.seller).sort(), ['id', 'username', 'pfp', 'city', 'country', 'memberSince'].sort());
        assert(!profile.listings.some(ad => ad.id === ids[1]));
        for (const status of ['active', 'sold', 'expired']) {
          const filtered = await service.findSellerProfile(owner, 1, status);
          assert(filtered.listings.every(ad => ad.status === status));
        }
        assert.equal(profile.summary.total, profile.summary.active + profile.summary.sold + profile.summary.expired);
        assert.equal((await service.findSellerProfile(owner, 100)).listings.length, 0);
        assert(profile.listings.length <= 20);
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
    assert.equal(Number((await client.query('select count(*) from users where username in ($1,$2)', [marker + 'A', marker + 'B'])).rows[0].count), 0);
    assert.equal(Number((await client.query('select count(*) from ads where title=$1', [marker])).rows[0].count), 0);
    console.log('PASS: unique views, owner exclusion, hidden protection, seller privacy, status filters and pagination. Verified all fixtures rolled back.');
  } finally {
    await client.end();
  }
}

check().catch(error => { console.error(error.message); process.exitCode = 1; });
