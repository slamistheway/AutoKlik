import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerStorageService } from '@nestjs/throttler';
import { RATE_LIMIT_OPTIONS } from './rate-limit.config';
import { UsersController } from './users/users.controller';
import { AdsController } from './ads/ads.controller';

describe('API rate limits', () => {
  let guard: ThrottlerGuard;
  let storage: ThrottlerStorageService;

  const request = (
    handler: 'login' | 'register' | 'getConversations',
    ip = '192.0.2.1',
  ) => {
    const header = jest.fn();
    const context = {
      getClass: () => UsersController,
      getHandler: () => UsersController.prototype[handler],
      switchToHttp: () => ({
        getRequest: () => ({
          ip,
          headers: { 'x-forwarded-for': '203.0.113.1' },
        }),
        getResponse: () => ({ header }),
      }),
    } as unknown as ExecutionContext;
    return { context, header };
  };

  beforeEach(async () => {
    jest.useFakeTimers();
    storage = new ThrottlerStorageService();
    guard = new ThrottlerGuard(RATE_LIMIT_OPTIONS, storage, new Reflector());
    await guard.onModuleInit();
  });

  afterEach(() => {
    storage.onApplicationShutdown();
    jest.useRealTimers();
  });

  it('exempts ad reads even when the IP has reached its limit, while ad mutations remain limited', async () => {
    const context = (handler: keyof AdsController) =>
      ({
        ...request('login').context,
        getClass: () => AdsController,
        getHandler: () => AdsController.prototype[handler],
      }) as ExecutionContext;
    for (let index = 0; index < 30; index++)
      await guard.canActivate(context('create'));
    await expect(guard.canActivate(context('create'))).rejects.toMatchObject({
      status: 429,
    });
    for (const handler of [
      'findAllAds',
      'findFeaturedAds',
      'findOne',
      'findMyAds',
      'findMySavedAds',
      'checkIfSaved',
    ] as const) {
      for (let index = 0; index < 150; index++) {
        await expect(guard.canActivate(context(handler))).resolves.toBe(true);
      }
    }
    await expect(guard.canActivate(context('saveAd'))).rejects.toMatchObject({
      status: 429,
    });
    await expect(
      guard.canActivate(request('login').context),
    ).rejects.toMatchObject({ status: 429 });
    await expect(
      guard.canActivate(request('register').context),
    ).rejects.toMatchObject({ status: 429 });
  });

  it.each(['register'] as const)(
    'blocks volumetric requests across routes, isolates clients and allows retry',
    async (handler) => {
      const { context, header } = request(handler);
      for (let index = 0; index < 120; index++) {
        await expect(
          guard.canActivate(index < 60 ? context : request('login').context),
        ).resolves.toBe(true);
        await jest.advanceTimersByTimeAsync(250);
      }
      await expect(guard.canActivate(context)).rejects.toMatchObject({
        status: 429,
      });
      expect(header).toHaveBeenCalledWith('Retry-After', 10);
      await expect(
        guard.canActivate(request(handler, '192.0.2.2').context),
      ).resolves.toBe(true);
      await jest.advanceTimersByTimeAsync(10001);
      await expect(guard.canActivate(context)).resolves.toBe(true);
    },
  );

  it('does not apply the registration limit to login requests', async () => {
    const { context } = request('login');
    for (let index = 0; index < 20; index++) {
      await expect(guard.canActivate(context)).resolves.toBe(true);
      await jest.advanceTimersByTimeAsync(250);
    }
  });

  it('allows normal conversation polling', async () => {
    const { context } = request('getConversations');
    for (let index = 0; index < 40; index++) {
      await expect(guard.canActivate(context)).resolves.toBe(true);
      await jest.advanceTimersByTimeAsync(5000);
    }
  });

  it('blocks automated API bursts with a short retry interval', async () => {
    const { context, header } = request('getConversations');
    for (let index = 0; index < 30; index++) {
      await guard.canActivate(context);
    }
    await expect(guard.canActivate(context)).rejects.toMatchObject({
      status: 429,
    });
    expect(header).toHaveBeenCalledWith('Retry-After-burst', 1);
    await jest.advanceTimersByTimeAsync(1001);
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('blocks sustained API flooding without extending the cooldown', async () => {
    const { context, header } = request('getConversations');
    for (let index = 0; index < 120; index++) {
      await guard.canActivate(context);
      await jest.advanceTimersByTimeAsync(250);
    }
    await expect(guard.canActivate(context)).rejects.toMatchObject({
      status: 429,
    });
    expect(header).toHaveBeenCalledWith('Retry-After', 10);
    await jest.advanceTimersByTimeAsync(5000);
    await expect(guard.canActivate(context)).rejects.toMatchObject({
      status: 429,
    });
    expect(header).toHaveBeenCalledWith('Retry-After', 5);
    await jest.advanceTimersByTimeAsync(5001);
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});
