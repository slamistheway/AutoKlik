import { buildRecommendationPreferences } from './recommendation-preferences';
import { AdsService } from './ads.service';
import { PgDialect } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

describe('Saved-ad recommendations', () => {
  const saved = {
    category: 'cars',
    subcategory: 'personal_cars',
    brand: 'Toyota',
    model: 'Corolla',
    fuel: 'petrol',
    price: '10000',
  };

  it('weights frequent brand/model preferences and normalizes casing', () => {
    const preferences = buildRecommendationPreferences([
      saved,
      { ...saved, brand: ' toyota ', price: '20000' },
      { ...saved, brand: 'BMW', model: 'X3', price: '0' },
    ]);
    expect(
      preferences.signals.find(
        (signal) => signal.field === 'brand' && signal.value === 'toyota',
      )?.weight,
    ).toBeCloseTo(10 / 3);
    expect(
      preferences.signals.find(
        (signal) => signal.field === 'model' && signal.value === 'corolla',
      )?.weight,
    ).toBeCloseTo(14 / 3);
    expect(preferences.price).toBe(15000);
    expect(buildRecommendationPreferences([])).toEqual({
      signals: [],
      price: null,
    });
  });

  it('falls back to random ads for guests', async () => {
    const limit = jest.fn().mockResolvedValue([]);
    const orderBy = jest.fn().mockReturnValue({ limit });
    const db = {
      select: () => ({ from: () => ({ where: () => ({ orderBy }) }) }),
    };
    const service = new AdsService(
      db as unknown as ConstructorParameters<typeof AdsService>[0],
    );
    await service.findRecommendedAds();
    expect(
      new PgDialect().sqlToQuery(
        (orderBy.mock.calls as unknown[][])[0][0] as Parameters<
          PgDialect['sqlToQuery']
        >[0],
      ).sql,
    ).toBe('random()');
    expect(limit).toHaveBeenCalledWith(30);
  });

  it('uses random ads for signed-in users while excluding own and saved ads', async () => {
    const limit = jest.fn().mockResolvedValue([]);
    const orderBy = jest.fn().mockReturnValue({ limit });
    const where = jest.fn().mockReturnValue({ orderBy });
    const savedWhere = jest.fn().mockReturnValue(sql`(select 42)`);
    const select = jest
      .fn()
      .mockReturnValueOnce({ from: () => ({ where: savedWhere }) })
      .mockReturnValue({ from: () => ({ where }) });
    const service = new AdsService({
      select,
    } as unknown as ConstructorParameters<typeof AdsService>[0]);
    await service.findRecommendedAds(7);
    const dialect = new PgDialect();
    const query = dialect.sqlToQuery(
      (where.mock.calls as unknown[][])[0][0] as Parameters<
        PgDialect['sqlToQuery']
      >[0],
    );
    expect(query.sql).toContain('"ads"."user_id" <>');
    expect(query.sql).toContain('not in (select 42)');
    expect(query.sql).toContain('"ads"."expires_at" > now()');
    expect(query.params).toEqual(['active', 7]);
    expect(
      dialect.sqlToQuery(
        (savedWhere.mock.calls as unknown[][])[0][0] as Parameters<
          PgDialect['sqlToQuery']
        >[0],
      ).params,
    ).toEqual([7]);
    expect(
      dialect.sqlToQuery(
        (orderBy.mock.calls as unknown[][])[0][0] as Parameters<
          PgDialect['sqlToQuery']
        >[0],
      ).sql,
    ).toBe('random()');
    expect(limit).toHaveBeenCalledWith(30);
    expect(select).toHaveBeenCalledTimes(2);
  });

  // Keep preference-ranking coverage available until ranking is re-enabled.
  it.skip('excludes own/saved ads, ranks candidates, and uses only the current user’s saved history', async () => {
    const conditions: unknown[] = [];
    const rankings: unknown[][] = [];
    const limit = jest
      .fn()
      .mockResolvedValueOnce([{ ad: saved }])
      .mockResolvedValue([]);
    const where = (condition: unknown) => {
      conditions.push(condition);
      return {
        orderBy: (...order: unknown[]) => {
          rankings.push(order);
          return { limit };
        },
      };
    };
    const from = () => ({ where, innerJoin: () => ({ where }) });
    const db = { select: () => ({ from }) };
    const service = new AdsService(
      db as unknown as ConstructorParameters<typeof AdsService>[0],
    );
    await service.findRecommendedAds(7);
    const dialect = new PgDialect();
    const preferenceQuery = dialect.sqlToQuery(
      conditions[0] as Parameters<PgDialect['sqlToQuery']>[0],
    );
    expect(preferenceQuery.params).toEqual([7]);
    // The saved-ID subquery is a Drizzle query in production; the fixture only verifies the owner predicate.
    const score = dialect.sqlToQuery(
      rankings[1][0] as Parameters<PgDialect['sqlToQuery']>[0],
    );
    expect(score.params).toContain('toyota');
    expect(score.params).toContain('corolla');
    expect(score.sql).toContain('case when');
    expect(limit).toHaveBeenCalledWith(100);
    expect(limit).toHaveBeenCalledWith(30);
    expect(conditions).toHaveLength(4);
  });

  it.skip('keeps preferred ads first and fills only the remaining slots randomly', async () => {
    const limit = jest
      .fn()
      .mockResolvedValueOnce([{ ad: saved }])
      .mockResolvedValueOnce([{ id: 1 }, { id: 2 }])
      .mockResolvedValueOnce([{ id: 3 }]);
    const orderBy = jest.fn().mockReturnValue({ limit });
    const where = jest.fn().mockReturnValue({ orderBy });
    const db = {
      select: () => ({ from: () => ({ where, innerJoin: () => ({ where }) }) }),
    };
    const service = new AdsService(
      db as unknown as ConstructorParameters<typeof AdsService>[0],
    );
    const exposed = service as unknown as {
      getAdsWithRelations: () => Promise<unknown[]>;
    };
    jest.spyOn(exposed, 'getAdsWithRelations').mockResolvedValue(
      [3, 2, 1].map((id) => ({
        ad: { ...saved, id, userId: 8 },
        sellerUsername: 'seller',
        imageUrl: null,
      })),
    );
    const result = await service.findRecommendedAds(7);
    expect(result.map((ad) => ad.id)).toEqual([1, 2, 3]);
    expect(limit).toHaveBeenLastCalledWith(28);
    expect(
      new PgDialect().sqlToQuery(
        (orderBy.mock.calls as unknown[][])[2][0] as Parameters<
          PgDialect['sqlToQuery']
        >[0],
      ).sql,
    ).toBe('random()');
  });

  it.skip('does not fetch random ads when thirty preference matches are available', async () => {
    const ids = Array.from({ length: 30 }, (_, index) => ({ id: index + 1 }));
    const limit = jest
      .fn()
      .mockResolvedValueOnce([{ ad: saved }])
      .mockResolvedValueOnce(ids);
    const where = () => ({ orderBy: () => ({ limit }) });
    const db = {
      select: () => ({ from: () => ({ where, innerJoin: () => ({ where }) }) }),
    };
    const service = new AdsService(
      db as unknown as ConstructorParameters<typeof AdsService>[0],
    );
    jest
      .spyOn(
        service as unknown as { getAdsWithRelations: () => Promise<unknown[]> },
        'getAdsWithRelations',
      )
      .mockResolvedValue([]);
    await service.findRecommendedAds(7);
    expect(limit).toHaveBeenCalledTimes(2);
  });
});
