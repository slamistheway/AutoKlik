import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AdsService } from './ads.service';
import { AdsController } from './ads.controller';
import { SessionAuthGuard } from '../auth/session-auth.guard';

describe('Unique profile ad views', () => {
  const setup = (status = 'active', exists = true) => {
    const viewers = new Set<number>();
    const insert = jest.fn().mockReturnValue({ values: ({ viewerId }: { viewerId: number }) => ({
      onConflictDoNothing: () => ({ returning: async () => {
        if (viewers.has(viewerId)) return [];
        viewers.add(viewerId);
        return [{ adId: 5 }];
      } }),
    }) });
    const tx = {
      select: (fields: Record<string, unknown>) => ({ from: () => ({ where: () => 'count' in fields
        ? Promise.resolve([{ count: viewers.size }])
        : { for: async () => exists ? [{ id: 5, userId: 7, status }] : [] },
      }) }), insert,
    };
    const service = new AdsService({ transaction: (callback: (value: typeof tx) => unknown) => callback(tx) } as unknown as ConstructorParameters<typeof AdsService>[0]);
    return { service, insert };
  };

  it('counts a profile only once, while counting other profiles independently', async () => {
    const { service } = setup();
    await expect(service.recordView(5, 8)).resolves.toEqual({ viewCount: 1, counted: true });
    await expect(service.recordView(5, 8)).resolves.toEqual({ viewCount: 1, counted: false });
    await expect(service.recordView(5, 9)).resolves.toEqual({ viewCount: 2, counted: true });
  });

  it('does not count the seller viewing their own ad', async () => {
    const { service, insert } = setup();
    await expect(service.recordView(5, 7)).resolves.toEqual({ viewCount: 0, counted: false });
    expect(insert).not.toHaveBeenCalled();
  });

  it('rejects missing profiles, invalid ads and hidden or deleted ads', async () => {
    await expect(setup().service.recordView(5, 0)).rejects.toMatchObject({ status: 400 });
    await expect(setup().service.recordView(-1, 8)).rejects.toMatchObject({ status: 400 });
    const hidden = setup('hidden');
    await expect(hidden.service.recordView(5, 8)).rejects.toMatchObject({ status: 404 });
    expect(hidden.insert).not.toHaveBeenCalled();
    await expect(setup('active', false).service.recordView(5, 8)).rejects.toMatchObject({ status: 404 });
  });

  it('requires an authenticated session for the counting endpoint', () => {
    const guards: unknown[] = Reflect.getMetadata(GUARDS_METADATA, AdsController.prototype.recordView);
    expect(guards).toContain(SessionAuthGuard);
  });

  it('rejects invalid seller filters before querying', async () => {
    const { service } = setup();
    await expect(service.findSellerProfile(0)).rejects.toMatchObject({ status: 400 });
    await expect(service.findSellerProfile(7, 0)).rejects.toMatchObject({ status: 400 });
    await expect(service.findSellerProfile(7, 1, 'hidden')).rejects.toMatchObject({ status: 400 });
  });
});
