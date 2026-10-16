import { PgDialect } from 'drizzle-orm/pg-core';
import { activeAdsCondition, effectiveAdStatus } from './ad-status';
import { AdsService } from './ads.service';
import { validateInput } from '../input-validation';

describe('Ad availability', () => {
  const now = new Date('2026-10-16T12:00:00Z');

  it('expires precisely at the deadline, while preserving sold and hidden states', () => {
    expect(effectiveAdStatus({ status: 'active', expiresAt: new Date(now.getTime() + 1) }, now)).toBe('active');
    expect(effectiveAdStatus({ status: 'active', expiresAt: now }, now)).toBe('expired');
    for (const status of ['sold', 'hidden']) expect(effectiveAdStatus({ status, expiresAt: now }, now)).toBe(status);
  });

  it('filters public ads by status and the database clock', () => {
    const query = new PgDialect().sqlToQuery(activeAdsCondition()!);
    expect(query.sql).toContain('"ads"."status" =');
    expect(query.sql).toContain('"ads"."expires_at" > now()');
    expect(query.params).toEqual(['active']);
  });

  it('accepts only supported owner-selected statuses and rejects expiry manipulation', () => {
    expect(validateInput({ status: 'sold' }, 'AdStatusDto')).toEqual({ status: 'sold' });
    for (const status of ['expired', 'draft', '']) expect(() => validateInput({ status }, 'AdStatusDto')).toThrow();
    expect(() => validateInput({ status: 'active', expiresAt: '2099-01-01' }, 'AdStatusDto')).toThrow();
  });

  it('scopes status updates to the owner and never extends expiry', async () => {
    const returning = jest.fn().mockResolvedValue([{ id: 5 }]);
    const where = jest.fn().mockReturnValue({ returning });
    const set = jest.fn().mockReturnValue({ where });
    const service = new AdsService({ update: () => ({ set }) } as unknown as ConstructorParameters<typeof AdsService>[0]);
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 5 } as Awaited<ReturnType<AdsService['findOne']>>);
    await service.updateStatus(5, 7, 'sold');
    expect(set).toHaveBeenCalledWith({ status: 'sold', dateLastUpdated: expect.any(Date) });
    const query = new PgDialect().sqlToQuery(where.mock.calls[0][0]);
    expect(query.params).toEqual([5, 7]);
    expect(query.sql).toContain('"ads"."user_id"');
    returning.mockResolvedValue([]);
    await expect(service.updateStatus(5, 8, 'hidden')).rejects.toMatchObject({ status: 404 });
    await expect(service.updateStatus(5, 7, 'expired')).rejects.toMatchObject({ status: 400 });
  });

  it('omits hidden ads from recent history and preserves viewing order', async () => {
    const where = jest.fn().mockReturnValue({ orderBy: () => Promise.resolve([]) });
    const join = { leftJoin: () => join, where };
    const service = new AdsService({ select: () => ({ from: () => join }) } as unknown as ConstructorParameters<typeof AdsService>[0]);
    await expect(service.findRecentlyViewed([4, 2])).resolves.toEqual([]);
    const query = new PgDialect().sqlToQuery(where.mock.calls[0][0]);
    expect(query.params).toEqual([4, 2, 'hidden']);
  });
});
