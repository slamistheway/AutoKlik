import { PgDialect } from 'drizzle-orm/pg-core';
import { UsersService } from './users.service';

describe('public user privacy', () => {
  it('selects only public fields and excludes restricted accounts', async () => {
    const conditions: unknown[] = [];
    const select = jest.fn((fields: Record<string, unknown>) => ({
      from: () => ({
        where: (condition: unknown) => {
          conditions.push(condition);
          return Promise.resolve([
            Object.fromEntries(
              Object.keys(fields).map((key) => [
                key,
                key === 'id' ? 7 : 'public',
              ]),
            ),
          ]);
        },
      }),
    }));
    const service = new UsersService(
      { select } as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const result = await service.getUser(7);
    expect(Object.keys(result).sort()).toEqual(
      [
        'id',
        'username',
        'pfp',
        'city',
        'country',
        'sellerVerified',
        'badges',
        'dealerStatus',
      ].sort(),
    );
    for (const key of [
      'email',
      'phone',
      'password',
      'firstName',
      'lastName',
      'role',
    ])
      expect(select.mock.calls[0][0]).not.toHaveProperty(key);
    const query = new PgDialect().sqlToQuery(conditions[0] as never);
    expect(query.params).toEqual([7, 'active']);
  });
});
