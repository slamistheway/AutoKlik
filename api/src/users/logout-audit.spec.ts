import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { createHash } from 'crypto';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { RegistrationAttemptsService } from './registration-attempts.service';
import { SessionsService } from './sessions.service';
import { JwtStrategy } from './jwt.strategy';
import { AuditService } from '../audit/audit.service';
import { AuditInterceptor } from '../audit/interceptors/audit.interceptor';
import { AuthAuditExceptionFilter } from '../audit/auth-audit-exception.filter';
import { InputValidationPipe } from '../input-validation';
import { AdsController } from '../ads/ads.controller';
import { AdsService } from '../ads/ads.service';
import { AdFetchRateLimitGuard } from '../ads/ad-fetch-rate-limit.guard';

describe('Server logout and audit events', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let audit: { record: jest.Mock };
  let sessions: { assertActive: jest.Mock; logout: jest.Mock };
  let ads: { create: jest.Mock; deleteAd: jest.Mock; update: jest.Mock };

  beforeEach(async () => {
    const revoked = new Set<string>();
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    sessions = {
      assertActive: jest.fn((hash: string) => {
        if (revoked.has(hash)) throw new UnauthorizedException();
      }),
      logout: jest.fn(
        async (hash: string, id: number, _expiry: number, ip: string) => {
          revoked.add(hash);
          await audit.record('logout', '/users/logout', id, ip);
          return { message: 'Odjava uspješna.' };
        },
      ),
    };
    ads = {
      update: jest.fn().mockResolvedValue({ id: 5 }),
      create: jest.fn().mockResolvedValue({ id: 5 }),
      deleteAd: jest.fn().mockResolvedValue({ message: 'Deleted' }),
    };
    const module = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: process.env.JWT_SECRET ?? 'dev_jwt_secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [UsersController, AdsController],
      providers: [
        JwtStrategy,
        { provide: SessionsService, useValue: sessions },
        { provide: AuditService, useValue: audit },
        { provide: AdsService, useValue: ads },
        {
          provide: UsersService,
          useValue: {
            getMe: (id: number) => ({ id }),
            updateProfile: (id: number, profile: unknown) => ({
              id,
              ...(profile as object),
            }),
            login: () => {
              throw new UnauthorizedException('Invalid credentials');
            },
            register: () => {
              throw new BadRequestException('Registration rejected');
            },
          },
        },
        {
          provide: RegistrationAttemptsService,
          useValue: {
            execute: (_ip: string, callback: () => unknown) => callback(),
          },
        },
        { provide: APP_FILTER, useClass: AuthAuditExceptionFilter },
        { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
      ],
    })
      .overrideGuard(AdFetchRateLimitGuard)
      .useValue({ canActivate: () => true })
      .compile();
    jwt = module.get(JwtService);
    app = module.createNestApplication();
    app.useGlobalPipes(new InputValidationPipe());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('revokes the current session, records logout once, and leaves other sessions active', async () => {
    const token = jwt.sign({ id: 7, jti: 'session-one' });
    const other = jwt.sign({ id: 7, jti: 'session-two' });
    await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    await request(app.getHttpServer())
      .post('/users/logout')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
    expect(sessions.logout).toHaveBeenCalledWith(
      createHash('sha256').update(token).digest('hex'),
      7,
      expect.any(Number),
      expect.any(String),
    );
    expect(audit.record).toHaveBeenCalledTimes(1);
    await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
    await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${other}`)
      .expect(200);
    await request(app.getHttpServer()).post('/users/logout').expect(401);
  });

  it('audits authentication failures including requests rejected by validation without recording credentials', async () => {
    await request(app.getHttpServer())
      .post('/users/login')
      .send({ identifier: 'unknown', password: 'secret' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/users/login')
      .send({})
      .expect(400);
    await request(app.getHttpServer())
      .post('/users/register')
      .send({})
      .expect(400);
    expect(
      (audit.record.mock.calls as unknown[][]).map((call) => call[0]),
    ).toEqual(['login_failed', 'login_failed', 'register_failed']);
    expect(audit.record).toHaveBeenCalledWith(
      'login_failed',
      '/users/login',
      null,
      expect.any(String),
    );
    expect(JSON.stringify(audit.record.mock.calls)).not.toContain('secret');
  });

  it('audits successful ad mutations using the authenticated actor, and does not audit failed deletion as success', async () => {
    const token = jwt.sign({ id: 7 });
    await request(app.getHttpServer())
      .post('/ads')
      .set('Authorization', `Bearer ${token}`)
      .send({
        user_id: 999,
        category: 'cars',
        subcategory: 'used',
        brand: 'Toyota',
        model: 'Corolla',
        title: 'Test',
        year: 2020,
      })
      .expect(201);
    const created = ads.create.mock.calls as [{ user_id: number }][];
    expect(created[0][0].user_id).toBe(7);
    expect(audit.record).toHaveBeenCalledWith(
      'ad_create',
      '/ads',
      7,
      expect.any(String),
    );
    await request(app.getHttpServer())
      .delete('/ads/delete/5')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(audit.record).toHaveBeenCalledWith(
      'ad_delete',
      '/ads/delete/5',
      7,
      expect.any(String),
    );
    await request(app.getHttpServer()).delete('/ads/5').expect(401);
    ads.deleteAd.mockRejectedValueOnce(new BadRequestException());
    const count = audit.record.mock.calls.length;
    await request(app.getHttpServer())
      .delete('/ads/5')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
    expect(audit.record).toHaveBeenCalledTimes(count);
  });

  it('persists revocation and the logout audit in the same database transaction', async () => {
    const values = jest.fn().mockReturnValue({
      onConflictDoNothing: jest.fn().mockResolvedValue(undefined),
    });
    const insert = jest.fn().mockReturnValue({ values });
    const transaction = jest.fn(
      async (callback: (tx: unknown) => Promise<void>) => callback({ insert }),
    );
    const service = new SessionsService({
      transaction,
    } as unknown as ConstructorParameters<typeof SessionsService>[0]);
    await service.logout('hashed-token', 7, 2000000000, '192.0.2.1');
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith({
      tokenHash: 'hashed-token',
      expiresAt: new Date(2000000000000),
    });
    expect(values).toHaveBeenCalledWith({
      action: 'logout',
      path: '/users/logout',
      userId: 7,
      ip: '192.0.2.1',
    });
  });

  it('requires authentication for edits and audits the authenticated ad/profile actor', async () => {
    await request(app.getHttpServer())
      .patch('/ads/5')
      .send({ title: 'Updated' })
      .expect(401);
    await request(app.getHttpServer())
      .patch('/users/me')
      .send({ firstName: 'Ana' })
      .expect(401);
    const token = jwt.sign({ id: 7 });
    await request(app.getHttpServer())
      .patch('/ads/5')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated' })
      .expect(200);
    expect(ads.update).toHaveBeenCalledWith(5, 7, { title: 'Updated' }, []);
    expect(audit.record).toHaveBeenCalledWith(
      'ad_update',
      '/ads/5',
      7,
      expect.any(String),
    );
    await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: 'Ana' })
      .expect(200);
    expect(audit.record).toHaveBeenCalledWith(
      'profile_update',
      '/users/me',
      7,
      expect.any(String),
    );
    ads.update.mockRejectedValueOnce(new BadRequestException());
    const count = audit.record.mock.calls.length;
    await request(app.getHttpServer())
      .patch('/ads/5')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated' })
      .expect(400);
    expect(audit.record).toHaveBeenCalledTimes(count);
  });

  it('rejects a token found in persistent revocation storage', async () => {
    const limit = jest.fn().mockResolvedValue([{ tokenHash: 'revoked' }]);
    const db = {
      select: () => ({ from: () => ({ where: () => ({ limit }) }) }),
    };
    const service = new SessionsService(
      db as unknown as ConstructorParameters<typeof SessionsService>[0],
    );
    await expect(service.assertActive('revoked')).rejects.toMatchObject({
      status: 401,
    });
    limit.mockResolvedValueOnce([]);
    await expect(service.assertActive('active')).resolves.toBeUndefined();
  });
});
