import { PgDialect } from 'drizzle-orm/pg-core';
import { AdsService } from './ads.service';
import { UsersService } from '../users/users.service';
import { validateInput } from '../input-validation';

describe('Published ad editing', () => {
  const setup = (owned = true) => {
    const conditions: unknown[] = [];
    const set = jest
      .fn()
      .mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) });
    const insertValues = jest.fn().mockResolvedValue(undefined);
    const remove = jest
      .fn()
      .mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) });
    const tx = {
      select: () => ({
        from: () => ({
          where: (condition: unknown) => {
            conditions.push(condition);
            return {
              for: () => Promise.resolve(owned ? [{ id: 5, userId: 7 }] : []),
              orderBy: () =>
                Promise.resolve([
                  { imageUrl: 'ad-images/first.jpg' },
                  { imageUrl: 'ad-images/second.jpg' },
                ]),
            };
          },
        }),
      }),
      update: () => ({ set }),
      delete: remove,
      insert: () => ({ values: insertValues }),
    };
    const db = {
      transaction: (callback: (value: typeof tx) => unknown) => callback(tx),
    };
    const service = new AdsService(
      db as unknown as ConstructorParameters<typeof AdsService>[0],
    );
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValue({ id: 5 } as Awaited<
        ReturnType<AdsService['findOne']>
      >);
    return { service, set, remove, insertValues, conditions };
  };

  it('updates supplied fields, preserves images and scopes the query to the owner', async () => {
    const { service, set, remove, conditions } = setup();
    await service.update(5, 7, { title: 'Updated', price: 12000 });
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Updated',
        price: '12000',
        dateLastUpdated: expect.any(Date) as Date,
      }),
    );
    expect((set.mock.calls as unknown[][])[0][0]).not.toHaveProperty(
      'description',
    );
    expect(remove).not.toHaveBeenCalled();
    const sql = new PgDialect().sqlToQuery(
      conditions[0] as Parameters<PgDialect['sqlToQuery']>[0],
    );
    expect(sql.sql).toContain('user_id');
    expect(sql.params).toEqual([5, 7]);
  });

  it('rejects edits to another user’s ad before any mutation', async () => {
    const { service, set, remove } = setup(false);
    await expect(
      service.update(5, 8, { title: 'Changed' }),
    ).rejects.toMatchObject({ status: 404 });
    expect(set).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it('supports removing/reordering images and adding images while updating the preview', async () => {
    const { service, set, insertValues } = setup();
    await service.update(
      5,
      7,
      { retainedImages: JSON.stringify(['ad-images/second.jpg']) },
      ['ad-images/new.jpg'],
    );
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ previewImg: 'ad-images/second.jpg' }),
    );
    expect(insertValues).toHaveBeenCalledWith([
      { adId: 5, imageUrl: 'ad-images/second.jpg' },
      { adId: 5, imageUrl: 'ad-images/new.jpg' },
    ]);
  });

  it('rejects foreign references, duplicates and more than ten photos', async () => {
    const { service, set } = setup();
    await expect(
      service.update(5, 7, { retainedImages: '["foreign.jpg"]' }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      service.update(5, 7, { retainedImages: '["same.jpg","same.jpg"]' }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      service.update(
        5,
        7,
        {},
        Array.from({ length: 11 }, (_, index) => `${index}.jpg`),
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(set).not.toHaveBeenCalled();
  });

  it('rejects ownership changes and empty mandatory fields', async () => {
    expect(() => validateInput({ user_id: 8 }, 'UpdateAdDto')).toThrow();
    await expect(
      setup().service.update(5, 7, { title: '' }),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe('Profile editing', () => {
  it('preserves omitted values and supports explicitly clearing a field', async () => {
    const returning = jest.fn().mockResolvedValue([
      {
        id: 7,
        username: 'test',
        email: 'test@example.invalid',
        firstName: 'Ana',
        lastName: 'Existing',
      },
    ]);
    const set = jest.fn().mockReturnValue({ where: () => ({ returning }) });
    const db = { update: () => ({ set }) };
    const service = new UsersService(
      db as unknown as ConstructorParameters<typeof UsersService>[0],
      {} as ConstructorParameters<typeof UsersService>[1],
      {} as ConstructorParameters<typeof UsersService>[2],
      {} as ConstructorParameters<typeof UsersService>[3],
    );
    await service.updateProfile(7, { firstName: ' Ana ', phone: '' });
    expect(set).toHaveBeenCalledWith({ firstName: 'Ana', phone: null });
    await expect(service.updateProfile(7, {})).rejects.toMatchObject({
      status: 400,
    });
  });
});
