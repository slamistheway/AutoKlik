import { PgDialect } from 'drizzle-orm/pg-core';
import { SavedSearchesService } from './saved-searches.service';

const dialect = new PgDialect();
const queryOf = (value: Parameters<PgDialect['sqlToQuery']>[0]) => dialect.sqlToQuery(value);

describe('saved search ownership and alerts', () => {
  it('rejects saved pagination/sort and injected owner IDs', async () => {
    const service = new SavedSearchesService({} as never);
    await expect(service.create(7, {name: 'Golf', filters: {sort: 'newest'}})).rejects.toMatchObject({status: 400});
    await expect(service.create(7, {name: 'Golf', userId: 9, filters: {}})).rejects.toMatchObject({status: 400});
  });

  it('enforces a per-user saved search limit under a transaction lock', async () => {
    const tx = {execute: jest.fn(), select: () => ({from: () => ({where: async () => [{total: 25}]})}), insert: jest.fn()};
    const service = new SavedSearchesService({transaction: async fn => fn(tx)} as never);
    await expect(service.create(7, {name: 'Golf', filters: {priceMax: '15000'}})).rejects.toMatchObject({status: 400});
    expect(tx.insert).not.toHaveBeenCalled();
    expect(queryOf(tx.execute.mock.calls[0][0]).params).toEqual(['saved-searches:7']);
  });

  it('scopes updates and deletion to the authenticated owner', async () => {
    const where = jest.fn(() => ({returning: async () => []}));
    const service = new SavedSearchesService({update: () => ({set: () => ({where})}), delete: () => ({where})} as never);
    await expect(service.update(7, 20, {alertsEnabled: false})).rejects.toMatchObject({status: 404});
    await expect(service.remove(7, 20)).rejects.toMatchObject({status: 404});
    for (const [condition] of where.mock.calls) expect(queryOf(condition).params).toEqual([20, 7]);
  });

  it('scopes reading an alert to its search owner', async () => {
    const where = jest.fn(() => ({returning: async () => []}));
    const service = new SavedSearchesService({update: () => ({set: () => ({where})})} as never);
    await expect(service.readAlert(7, 31)).rejects.toMatchObject({status: 404});
    const query = queryOf(where.mock.calls[0][0]);
    expect(query.params).toEqual([31, 7]);
    expect(query.sql).toContain('exists');
  });

  it('matches only new public ads from other sellers and deduplicates without resetting read state', async () => {
    const saved = {id: 3, userId: 7, filters: {brands: 'VW', priceMax: '15000', fuel: 'diesel'}, createdAt: new Date('2026-01-01T00:00:00Z')};
    const tx = {execute: jest.fn(), select: () => ({from: () => ({where: async () => [saved]})})};
    const joined = {innerJoin: () => joined, where: () => ({orderBy: () => ({limit: async () => []})})};
    const count = {innerJoin: () => count, where: async () => [{total: 0}]};
    const select = jest.fn().mockReturnValueOnce({from: () => joined}).mockReturnValueOnce({from: () => count});
    const service = new SavedSearchesService({transaction: async fn => fn(tx), select} as never);
    expect(await service.alerts(7)).toEqual({items: [], unreadCount: 0});
    const query = queryOf(tx.execute.mock.calls[1][0]);
    expect(query.sql).toContain('on conflict (saved_search_id, ad_id) do nothing');
    expect(query.sql).toContain('"date_created" >');
    expect(query.sql).toContain('"account_status"');
    expect(query.params).toEqual(expect.arrayContaining([3, 7, 'VW', '15000', 'diesel']));
    expect(query.sql).not.toContain('limit');
    expect(query.sql).not.toContain('update');
  });
});
