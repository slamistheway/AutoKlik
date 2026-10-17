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
  const marker = `pricerollback${Date.now()}`;
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
        await client.query('update ads set price=10000 where id=$1', [ids[0]]);
        await service.saveAd(viewers[0], ids[0]);
        await service.saveAd(owner, ids[0]);
        await service.update(ids[0], owner, {price: 9000});
        let feed = await service.getPriceDropNotifications(viewers[0]);
        assert.equal(feed.items.length, 1);
        assert.equal(feed.unreadCount, 1);
        assert.equal(Number(feed.items[0].oldPrice), 10000);
        assert.equal(Number(feed.items[0].newPrice), 9000);
        assert.equal((await service.getPriceDropNotifications(owner)).items.filter(item => item.adId === ids[0]).length, 0);
        assert.equal((await service.getPriceDropNotifications(viewers[1])).items.length, 0);
        await service.update(ids[0], owner, {price: 9000});
        await service.update(ids[0], owner, {description: 'No price edit'});
        await service.update(ids[0], owner, {price: 9500});
        assert.equal((await service.getPriceDropNotifications(viewers[0])).items.length, 1);
        await assert.rejects(service.readPriceDropNotification(feed.items[0].id, viewers[1]), error => error.status === 404);
        await service.readPriceDropNotification(feed.items[0].id, viewers[0]);
        await service.readPriceDropNotification(feed.items[0].id, viewers[0]);
        assert.equal((await service.getPriceDropNotifications(viewers[0])).unreadCount, 0);
        await service.update(ids[0], owner, {price: 8500});
        feed = await service.getPriceDropNotifications(viewers[0]);
        assert.equal(feed.items.length, 2);
        assert.equal(feed.unreadCount, 1);
        await service.unsaveAd(viewers[0], ids[0]);
        await service.update(ids[0], owner, {price: 8000});
        assert.equal((await service.getPriceDropNotifications(viewers[0])).items.length, 2);
        await service.updateStatus(ids[0], owner, 'hidden');
        assert.equal((await service.getPriceDropNotifications(viewers[0])).items.length, 0);
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
    assert.equal(Number((await client.query('select count(*) from users where username in ($1,$2)', [marker + 'A', marker + 'B'])).rows[0].count), 0);
    assert.equal(Number((await client.query('select count(*) from ads where title=$1', [marker])).rows[0].count), 0);
    console.log('PASS: price drops, retry deduplication, subscriber/owner exclusion, no alerts on increases, read authorization/idempotency, unsave and hidden protection. Verified all fixtures rolled back.');
  } finally {
    await client.end();
  }
}

check().catch(error => { console.error(error.message); process.exitCode = 1; });
