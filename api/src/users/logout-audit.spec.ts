import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

import { Test } from '@nestjs/testing';
import request from 'supertest';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { RegistrationAttemptsService } from './registration-attempts.service';
import { BetterAuthService } from '../auth/better-auth.service';

import { AuditService } from '../audit/audit.service';
import { AuditInterceptor } from '../audit/interceptors/audit.interceptor';
import { AuthAuditExceptionFilter } from '../audit/auth-audit-exception.filter';
import { InputValidationPipe } from '../input-validation';
import { AdsController } from '../ads/ads.controller';
import { AdsService } from '../ads/ads.service';
import { AdFetchRateLimitGuard } from '../ads/ad-fetch-rate-limit.guard';
import { SavedSearchesService } from '../ads/saved-searches.service';
import { MessageEventsService } from './message-events.service';

describe('Server logout and audit events', () => {
  let app: INestApplication;
  let sessionIssuer: { sign: (user: { id: number; jti?: string }) => string };
  let audit: { record: jest.Mock };
  let sessions: { authenticate: jest.Mock; logout: jest.Mock };
  let ads: { create: jest.Mock; deleteAd: jest.Mock; update: jest.Mock };

  beforeEach(async () => {
    const revoked = new Set<string>();
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    const identities = new Map<string, number>();
    sessionIssuer = {
      sign: (user) => {
        const token = user.jti ?? `test-session-${identities.size}`;
        identities.set(token, user.id);
        return token;
      },
    };
    sessions = {
      authenticate: jest.fn((req: { headers: { authorization?: string } }) => {
        const token = req.headers.authorization?.replace(/^Bearer /, '');
        return token && identities.has(token) && !revoked.has(token)
          ? { id: identities.get(token), sessionId: token }
          : null;
      }),
      logout: jest.fn(
        async (req: {
          user: { id: number; sessionId: string };
          ip: string;
        }) => {
          revoked.add(req.user.sessionId);
          await audit.record('logout', '/users/logout', req.user.id, req.ip);
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
      controllers: [UsersController, AdsController],
      providers: [
        { provide: SavedSearchesService, useValue: {} },
        { provide: MessageEventsService, useValue: {} },
        { provide: BetterAuthService, useValue: sessions },
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

    app = module.createNestApplication();
    app.useGlobalPipes(new InputValidationPipe());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('revokes the current session, records logout once, and leaves other sessions active', async () => {
    const token = sessionIssuer.sign({ id: 7, jti: 'session-one' });
    const other = sessionIssuer.sign({ id: 7, jti: 'session-two' });
    await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    await request(app.getHttpServer())
      .post('/users/logout')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
    expect(sessions.logout).toHaveBeenCalledWith(
      expect.objectContaining({ user: { id: 7, sessionId: 'session-one' } }),
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
    const token = sessionIssuer.sign({ id: 7 });
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

  it('requires authentication for edits and audits the authenticated ad/profile actor', async () => {
    await request(app.getHttpServer())
      .patch('/ads/5')
      .send({ title: 'Updated' })
      .expect(401);
    await request(app.getHttpServer())
      .patch('/users/me')
      .send({ firstName: 'Ana' })
      .expect(401);
    const token = sessionIssuer.sign({ id: 7 });
    await request(app.getHttpServer())
      .patch('/ads/5')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated' })
      .expect(200);
    expect(ads.update).toHaveBeenCalledWith(5, 7, { title: 'Updated' }, [], expect.any(Function));
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
});
