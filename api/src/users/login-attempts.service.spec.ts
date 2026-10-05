import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginAttemptsService } from './login-attempts.service';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { RegistrationAttemptsService } from './registration-attempts.service';
import type { Response } from 'express';

jest.mock('bcrypt', () => ({ compare: jest.fn(), hash: jest.fn() }));

describe('failed login cooldown', () => {
  let service: UsersService;
  let limit: jest.Mock;
  const compare = (bcrypt as unknown as { compare: jest.Mock }).compare;
  const user = {
    id: 7,
    username: 'test',
    email: 'test@example.invalid',
    password: 'hash',
    pfp: null,
  };
  const dto = { identifier: user.username, password: 'wrong' };

  beforeEach(() => {
    jest.useFakeTimers();
    for (const method of ['log', 'debug', 'warn', 'error'] as const) {
      jest.spyOn(Logger.prototype, method).mockImplementation(() => undefined);
    }
    limit = jest.fn().mockResolvedValue([user]);
    const db = {
      select: () => ({ from: () => ({ where: () => ({ limit }) }) }),
    };
    const jwt = { sign: jest.fn().mockReturnValue('token') };
    service = new UsersService(
      db as unknown as ConstructorParameters<typeof UsersService>[0],
      jwt as unknown as JwtService,
      new LoginAttemptsService(),
    );
    compare.mockResolvedValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  const failNineTimes = async () => {
    for (let index = 0; index < 9; index++) {
      await expect(service.login(dto)).rejects.toMatchObject({ status: 401 });
    }
  };

  it('starts cooldown on the tenth failure and shares it between email and username', async () => {
    await failNineTimes();
    await expect(service.login(dto)).rejects.toMatchObject({ status: 429 });
    compare.mockResolvedValue(true);
    await expect(
      service.login({ ...dto, identifier: user.email }),
    ).rejects.toMatchObject({ status: 429 });
    await jest.advanceTimersByTimeAsync(900001);
    await expect(service.login(dto)).resolves.toMatchObject({ token: 'token' });
  });

  it('clears earlier failures after a successful login and does not count successes', async () => {
    await failNineTimes();
    compare.mockResolvedValue(true);
    for (let index = 0; index < 12; index++) {
      await expect(service.login(dto)).resolves.toMatchObject({
        token: 'token',
      });
    }
    compare.mockResolvedValue(false);
    await expect(service.login(dto)).rejects.toMatchObject({ status: 401 });
  });

  it('does not count malformed input or database errors as failed credentials', async () => {
    await failNineTimes();
    await expect(service.login({ ...dto, password: '' })).rejects.toMatchObject(
      { status: 400 },
    );
    limit.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(service.login(dto)).rejects.toMatchObject({ status: 500 });
    compare.mockResolvedValue(true);
    await expect(service.login(dto)).resolves.toMatchObject({ token: 'token' });
  });

  it('expires inactive failure counters after fifteen minutes', async () => {
    await failNineTimes();
    await jest.advanceTimersByTimeAsync(15 * 60000 + 1);
    await expect(service.login(dto)).rejects.toMatchObject({ status: 401 });
  });

  it('also limits invalid identifiers without storing their plaintext', async () => {
    limit.mockResolvedValue([]);
    await failNineTimes();
    await expect(service.login(dto)).rejects.toMatchObject({ status: 429 });
  });

  it('does not lose failures from concurrent password checks', async () => {
    await failNineTimes();
    const results = await Promise.allSettled([
      service.login(dto),
      service.login(dto),
    ]);
    for (const result of results) {
      expect(result.status).toBe('rejected');
      if (result.status === 'rejected') {
        expect((result.reason as { status: number }).status).toBe(429);
      }
    }
  });

  it('returns Retry-After through the controller for the login countdown', async () => {
    await failNineTimes();
    const controller = new UsersController(
      service,
      new RegistrationAttemptsService(new LoginAttemptsService()),
    );
    const response = { setHeader: jest.fn() };
    await expect(
      controller.login(dto, response as unknown as Response),
    ).rejects.toMatchObject({ status: 429 });
    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', 900);
  });

  it('doubles repeated account cooldowns even after a successful login', async () => {
    for (const minutes of [15, 30, 60]) {
      compare.mockResolvedValue(false);
      await failNineTimes();
      await expect(service.login(dto)).rejects.toMatchObject({
        response: { retryAfter: minutes * 60 },
      });
      await jest.advanceTimersByTimeAsync(minutes * 60000 + 1);
      compare.mockResolvedValue(true);
      await expect(service.login(dto)).resolves.toMatchObject({
        token: 'token',
      });
    }
  });

  it('caps cooldowns at 24 hours and expires old lockout history', async () => {
    const attempts = new LoginAttemptsService();
    for (const minutes of [15, 30, 60, 120, 240, 480, 960, 1440, 1440]) {
      for (let index = 0; index < 9; index++)
        attempts.recordFailure('user:cap');
      await expect(
        Promise.resolve().then(() => attempts.recordFailure('user:cap')),
      ).rejects.toMatchObject({ response: { retryAfter: minutes * 60 } });
      await jest.advanceTimersByTimeAsync(minutes * 60000 + 1);
    }
    await jest.advanceTimersByTimeAsync(24 * 60 * 60000 + 1);
    for (let index = 0; index < 9; index++) attempts.recordFailure('user:cap');
    await expect(
      Promise.resolve().then(() => attempts.recordFailure('user:cap')),
    ).rejects.toMatchObject({ response: { retryAfter: 900 } });
  });
});
