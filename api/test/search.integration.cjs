require('dotenv').config({quiet: true});
require('reflect-metadata');
require('ts-node').register({transpileOnly: true, preferTsExts: true});
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {Client} = require('pg');
const {drizzle} = require('drizzle-orm/node-postgres');
const {sql} = require('drizzle-orm');
const {generateDrizzleJson, generateMigration} = require('drizzle-kit/api');
const {AdsService} = require('../src/ads/ads.service');
const {SavedSearchesService} = require('../src/ads/saved-searches.service');

async function main() {
    assert(['localhost', '127.0.0.1', '[::1]'].includes(new URL(process.env.DATABASE_URL).hostname), 'Local database only');
    const client = new Client({connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000});
    await client.connect();
    const namespace = `search_check_${Date.now()}`;
    const rollback = new Error('Rollback search fixtures');
    try {
        try {
            await drizzle(client).transaction(async tx => {
                await tx.execute(sql.raw(`create schema "${namespace}"`));
                await tx.execute(sql.raw(`set local search_path to "${namespace}"`));
                const baseline = require('../drizzle/meta/0015_snapshot.json');
                const ddl = await generateMigration(generateDrizzleJson({}), baseline);
                for (const statement of [...ddl, ...['0016_admin_moderation', '0017_admin_indexes', '0018_user_management_safety', '0019_erasure_file_cleanup', '0020_user_blocks', '0021_complete_search'].map(name => fs.readFileSync(`drizzle/${name}.sql`, 'utf8'))]) {
                    await tx.execute(sql.raw(statement.replaceAll('"public".', `"${namespace}".`)));
                }
                const [buyer, seller, other] = (await client.query("insert into users(username,email,password) values ('buyer','buyer@example.test','x'),('seller','seller@example.test','x'),('other','other@example.test','x') returning id")).rows.map(row => Number(row.id));
                const saved = new SavedSearchesService(tx);
                const ads = new AdsService(tx);
                const filters = {brands: 'Volkswagen', models: 'Golf', fuel: 'diesel', priceMin: '0', priceMax: '15000', yearMin: '2015', yearMax: '2025', kilometrageMax: '120000', enginePowerMin: '70', enginePowerMax: '150', engineSizeMin: '1400', engineSizeMax: '2000', condition: 'Rabljeno', counties: 'grad_zagreb', sellerType: 'privatni', buyOrLease: 'buy', gearType: 'manual', colors: '#111827', doorNumber: '5+'};
                const search = await saved.create(buyer, {name: 'Golf diesel under 15000', filters});
                const inserted = (await client.query(`insert into ads(user_id,title,brand,model,category,subcategory,price,year,kilometrage,engine_power,engine_size,fuel,condition,county,seller_type,buy_or_lease,gear_type,color,door_number,date_created)
                    select $1,'Golf ' || n,'Volkswagen','Golf','car','compact',10000+n,2020,90000,100,1600,'diesel','Rabljeno','grad_zagreb','privatni','buy','manual','#111827',5,now()+interval '1 second' from generate_series(1,40) n returning id`, [seller])).rows;
                await client.query("insert into ad_images(ad_id,image_url) values ($1,'one.jpg'),($1,'two.jpg')", [inserted[0].id]);
                let result = await ads.search({...filters, sort: 'priceAsc', page: '2', pageSize: '7'}, buyer);
                assert.equal(result.total, 40); assert.equal(result.totalPages, 6); assert.equal(result.items.length, 7);
                assert.equal(Number(result.items[0].price), 10008);
                assert.equal(new Set(result.items.map(ad => ad.id)).size, 7);
                assert.equal(result.items[0].engine_size, 1600);
                assert.equal((await ads.findAllAds()).length, 30, 'Homepage keeps its existing array contract and cap');
                await client.query('insert into saved_ads(user_id,ad_id) values ($1,$2)', [buyer, inserted[0].id]);
                result = await ads.search({...filters, sort: 'priceAsc'}, buyer);
                assert.equal(result.items[0].is_saved, true);
                let alerts = await saved.alerts(buyer);
                assert.equal(alerts.unreadCount, 40); assert.equal(alerts.items.length, 30);
                await saved.readAlert(buyer, alerts.items[0].id);
                assert.equal((await saved.alerts(buyer)).unreadCount, 39, 'Repeated polling does not duplicate or unread alerts');
                await assert.rejects(saved.readAlert(other, alerts.items[0].id), error => error.status === 404);
                await assert.rejects(saved.update(other, search.id, {alertsEnabled: false}), error => error.status === 404);
                await assert.rejects(saved.remove(other, search.id), error => error.status === 404);
                assert.equal((await saved.list(other)).length, 0);
                await saved.update(buyer, search.id, {alertsEnabled: false});
                assert.equal((await saved.alerts(buyer)).unreadCount, 0);
                await saved.update(buyer, search.id, {alertsEnabled: true});
                await client.query("update ads set status='hidden' where id=$1", [inserted[0].id]);
                assert.equal((await ads.search(filters)).total, 39);
                await client.query("update users set account_status='suspended' where id=$1", [seller]);
                assert.equal((await saved.alerts(buyer)).unreadCount, 0);
                assert.equal((await ads.search(filters)).total, 0);
                await saved.remove(buyer, search.id);
                assert.equal((await client.query('select count(*)::int as n from search_alerts')).rows[0].n, 0);
                throw rollback;
            });
        } catch (error) { if (error !== rollback) throw error; }
        assert.equal((await client.query('select to_regnamespace($1) as name', [namespace])).rows[0].name, null);
        console.log('PASS: all filters, numeric sorting, >30 results, pagination/image deduplication, saved status, new-match alerts, read deduplication, ownership, alert pause/resume, restricted listings and cascading deletion. Migrations and fixtures rolled back.');
    } finally { await client.end(); }
}
main().catch(error => { console.error(error.stack ?? error); process.exitCode = 1; });
