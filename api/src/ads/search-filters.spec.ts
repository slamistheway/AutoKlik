import { and } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { parseSearch, searchConditions, searchOrder } from './search-filters';
import { AdsService } from './ads.service';

const dialect = new PgDialect();

describe('complete search filters', () => {
  it('builds all visible filters with parameterized numeric price and range comparisons', () => {
    const input = {search: 'Golf', category: 'car', subcategory: 'compact', brands: 'VW,Audi,VW', models: 'Golf', fuel: 'diesel', priceMin: '0', priceMax: '15000', yearMin: '2010', yearMax: '2025', kilometrageMin: '0', kilometrageMax: '120000', enginePowerMin: '70', enginePowerMax: '150', engineSizeMin: '1400', engineSizeMax: '2000', counties: 'grad_zagreb', condition: 'Rabljeno', buyOrLease: 'buy', sellerType: 'privatni', gearType: 'manual', colors: '#111827', doorNumber: '5+'};
    const filters = parseSearch(input);
    expect(filters.brands).toBe('Audi,VW');
    const query = dialect.sqlToQuery(and(...searchConditions(filters))!);
    for (const column of ['category', 'subcategory', 'brand', 'model', 'fuel', 'price', 'year', 'kilometrage', 'engine_power', 'engine_size', 'county', 'condition', 'buy_or_lease', 'seller_type', 'gear_type', 'color', 'door_number']) expect(query.sql).toContain(`"${column}"`);
    expect(query.sql).toContain('"price" <=');
    expect(query.params).toContain('15000');
    expect(query.params).toContain(120000);
    expect(query.params).toContain(0);
    expect(query.params).toContain(5);
    expect(query.sql).not.toContain('15000');
  });

  it.each([
    {priceMin: '-1'}, {priceMax: 'NaN'}, {priceMin: '200', priceMax: '100'},
    {yearMin: '1900.5'}, {kilometrageMax: 'Infinity'}, {page: '0'}, {pageSize: '61'},
    {page: '100001'}, {sort: 'random()'}, {brands: ['VW']}, {userId: '9'},
  ])('rejects malformed search input %j', input => expect(() => parseSearch(input)).toThrow());

  it('treats wildcard characters in search terms literally', () => {
    const query = dialect.sqlToQuery(and(...searchConditions(parseSearch({search: '100%_sale'})))!);
    expect(query.params[0]).toBe('%100\\%\\_sale%');
  });

  it('adds stable tie-breaking and puts missing numeric values last', () => {
    const order = searchOrder('priceAsc').map(value => dialect.sqlToQuery(value).sql).join(', ');
    expect(order).toContain('"price" asc nulls last');
    expect(order).toContain('"id" desc');
  });

  it('paginates ad IDs before joining images and preserves numeric-sort order', async () => {
    const offset = jest.fn().mockResolvedValue([{id: 20}, {id: 10}]);
    const limit = jest.fn(() => ({offset}));
    const orderBy = jest.fn(() => ({limit}));
    const db = {select: jest.fn()
      .mockReturnValueOnce({from: () => ({where: async () => [{total: 50}]})})
      .mockReturnValueOnce({from: () => ({where: () => ({orderBy})})})};
    const service = new AdsService(db as never);
    const internals = service as unknown as {getAdsWithRelations: jest.Mock; mapJoinedAds: jest.Mock};
    internals.getAdsWithRelations = jest.fn().mockResolvedValue([]);
    internals.mapJoinedAds = jest.fn().mockReturnValue([{id: 10}, {id: 20}]);
    const result = await service.search({page: '2', pageSize: '2', sort: 'priceAsc'});
    expect(result).toMatchObject({total: 50, page: 2, pageSize: 2, totalPages: 25});
    expect(result.items.map(item => item.id)).toEqual([20, 10]);
    expect(offset).toHaveBeenCalledWith(2);
    expect(limit).toHaveBeenCalledWith(2);
  });
});
