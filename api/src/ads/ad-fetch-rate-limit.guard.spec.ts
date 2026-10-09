import type { ExecutionContext, INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ThrottlerModule, ThrottlerStorageService } from '@nestjs/throttler';
import request from 'supertest';
import { AdFetchRateLimitGuard } from './ad-fetch-rate-limit.guard';
import { AdsController } from './ads.controller';
import { AdsService } from './ads.service';
import { JwtStrategy } from '../users/jwt.strategy';
import { SessionsService } from '../users/sessions.service';

describe('Ad fetching limits', () => {
  let storage: ThrottlerStorageService;
  let guard: AdFetchRateLimitGuard;
  const context = (
    handler: 'findAllAds' | 'findFeaturedAds' | 'findOne',
    id?: number,
    ip = '192.0.2.1',
  ) => {
    const header = jest.fn();
    return {
      header,
      context: {
        getClass: () => AdsController,
        getHandler: () => AdsController.prototype[handler],
        switchToHttp: () => ({
          getRequest: () => ({
            ip,
            user: id ? { id } : undefined,
            headers: { 'x-forwarded-for': '203.0.113.1' },
          }),
          getResponse: () => ({ header }),
        }),
      } as unknown as ExecutionContext,
    };
  };

  beforeEach(async () => {
    jest.useFakeTimers();
    storage = new ThrottlerStorageService();
    guard = new AdFetchRateLimitGuard(storage, new Reflector());
    await guard.onModuleInit();
  });

  afterEach(() => {
    storage.onApplicationShutdown();
    jest.useRealTimers();
  });

  it.each([
    [undefined, 70],
    [1, 140],
  ] as const)(
    'limits identity %s to %s reads across endpoints',
    async (id, limit) => {
      for (let index = 0; index < limit; index++) {
        await guard.canActivate(
          context(index % 2 ? 'findAllAds' : 'findFeaturedAds', id).context,
        );
      }
      const blocked = context('findOne', id);
      await expect(guard.canActivate(blocked.context)).rejects.toMatchObject({
        status: 429,
      });
      expect(blocked.header).toHaveBeenCalledWith('Retry-After-ad-fetch', 60);
      await jest.advanceTimersByTimeAsync(60001);
      await expect(guard.canActivate(blocked.context)).resolves.toBe(true);
    },
  );

  it('isolates anonymous IPs and user IDs, and keeps a user allowance across IP changes', async () => {
    for (let index = 0; index < 140; index++)
      await guard.canActivate(context('findOne', 1).context);
    await expect(
      guard.canActivate(context('findAllAds', 1, '192.0.2.2').context),
    ).rejects.toMatchObject({ status: 429 });
    await expect(
      guard.canActivate(context('findOne', 2).context),
    ).resolves.toBe(true);
    for (let index = 0; index < 70; index++)
      await guard.canActivate(context('findOne').context);
    await expect(
      guard.canActivate(context('findOne', undefined, '192.0.2.2').context),
    ).resolves.toBe(true);
  });
});

describe('Ad fetching authentication and guard wiring', () => {
  let app: INestApplication;
  let jwt: JwtService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
        JwtModule.register({
          secret: process.env.JWT_SECRET ?? 'dev_jwt_secret',
        }),
      ],
      controllers: [AdsController],
      providers: [
        { provide: SessionsService, useValue: { assertActive: jest.fn() } },
        JwtStrategy,
        AdFetchRateLimitGuard,
        {
          provide: AdsService,
          useValue: {
            findAllAds: () => [],
            findFeaturedAds: () => [],
            findOne: () => ({}),
            fetchAllAdsByUserId: () => [],
            fetchSavedAds: () => [],
            checkIfSaved: () => false,
          },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    jwt = module.get(JwtService);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('verifies JWTs before granting 140 reads and shares the quota with private ad reads', async () => {
    const token = jwt.sign({ id: 42 }, { expiresIn: '1h' });
    for (let index = 0; index < 140; index++) {
      const route = [
        '/ads/all',
        '/ads/featured',
        '/ads/1',
        '/ads/me',
        '/ads/me/saved',
        '/ads/saved/1',
      ][index % 6];
      await request(app.getHttpServer())
        .get(route)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    }
    await request(app.getHttpServer())
      .get('/ads/featured')
      .set('Authorization', `Bearer ${token}`)
      .expect(429);
    await request(app.getHttpServer()).get('/ads/featured').expect(200);
  });

  it('counts invalid and expired tokens as anonymous and cannot bypass 70 reads by changing routes', async () => {
    const expired = jwt.sign({ id: 42 }, { expiresIn: -1 });
    for (let index = 0; index < 70; index++) {
      await request(app.getHttpServer())
        .get(index % 2 ? '/ads/all' : '/ads/featured')
        .set('Authorization', `Bearer ${index % 2 ? expired : 'invalid-token'}`)
        .expect(200);
    }
    await request(app.getHttpServer()).get('/ads/1').expect(429);
  });
});
