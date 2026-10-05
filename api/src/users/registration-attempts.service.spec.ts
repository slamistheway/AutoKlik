import {
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { LoginAttemptsService } from './login-attempts.service';
import { RegistrationAttemptsService } from './registration-attempts.service';

describe('registration limits', () => {
  let service: RegistrationAttemptsService;
  const ip = '192.0.2.1';

  beforeEach(() => {
    jest.useFakeTimers();
    service = new RegistrationAttemptsService(new LoginAttemptsService());
  });

  afterEach(() => jest.useRealTimers());

  it('allows three successful registrations per rolling hour and isolates IPs', async () => {
    const register = jest.fn().mockResolvedValue({ message: 'ok' });
    for (let index = 0; index < 3; index++) await service.execute(ip, register);
    await expect(service.execute(ip, register)).rejects.toMatchObject({
      status: 429,
      response: { retryAfter: 3600 },
    });
    expect(register).toHaveBeenCalledTimes(3);
    await expect(service.execute('192.0.2.2', register)).resolves.toEqual({
      message: 'ok',
    });
    await jest.advanceTimersByTimeAsync(3600001);
    await expect(service.execute(ip, register)).resolves.toEqual({
      message: 'ok',
    });
  });

  it('doubles cooldowns after each batch of ten failed registrations', async () => {
    const register = jest.fn().mockRejectedValue(new ConflictException());
    for (const minutes of [15, 30, 60]) {
      for (let index = 0; index < 9; index++) {
        await expect(service.execute(ip, register)).rejects.toMatchObject({
          status: 409,
        });
      }
      await expect(service.execute(ip, register)).rejects.toMatchObject({
        status: 429,
        response: { retryAfter: minutes * 60 },
      });
      const calls = register.mock.calls.length;
      await expect(service.execute(ip, register)).rejects.toMatchObject({
        status: 429,
      });
      expect(register).toHaveBeenCalledTimes(calls);
      await jest.advanceTimersByTimeAsync(minutes * 60000 + 1);
    }
  });

  it('does not count failed submissions as successes, and success resets failures', async () => {
    const register = jest.fn().mockRejectedValue(new ConflictException());
    for (let index = 0; index < 9; index++) {
      await expect(service.execute(ip, register)).rejects.toMatchObject({
        status: 409,
      });
    }
    register.mockResolvedValueOnce({ message: 'ok' });
    await service.execute(ip, register);
    await expect(service.execute(ip, register)).rejects.toMatchObject({
      status: 409,
    });
    register.mockResolvedValue({ message: 'ok' });
    await service.execute(ip, register);
    await service.execute(ip, register);
    await expect(service.execute(ip, register)).rejects.toMatchObject({
      status: 429,
    });
  });

  it('does not count server errors as failed registration attempts', async () => {
    const register = jest
      .fn()
      .mockRejectedValue(new InternalServerErrorException());
    for (let index = 0; index < 12; index++) {
      await expect(service.execute(ip, register)).rejects.toMatchObject({
        status: 500,
      });
    }
    register.mockResolvedValue({ message: 'ok' });
    await expect(service.execute(ip, register)).resolves.toEqual({
      message: 'ok',
    });
  });

  it('reserves quota for in-flight registrations so parallel requests cannot exceed three', async () => {
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const register = jest.fn(() => pending);
    const requests = [
      service.execute(ip, register),
      service.execute(ip, register),
      service.execute(ip, register),
    ];
    await expect(service.execute(ip, register)).rejects.toMatchObject({
      status: 429,
    });
    expect(register).toHaveBeenCalledTimes(3);
    finish();
    await Promise.all(requests);
    await expect(service.execute(ip, register)).rejects.toMatchObject({
      status: 429,
    });
  });

  it('does not let an in-flight successful request clear an active cooldown', async () => {
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const request = service.execute(ip, () => pending);
    const fail = () => Promise.reject(new ConflictException());
    for (let index = 0; index < 9; index++) {
      await expect(service.execute(ip, fail)).rejects.toMatchObject({
        status: 409,
      });
    }
    await expect(service.execute(ip, fail)).rejects.toMatchObject({
      status: 429,
    });
    finish();
    await request;
    await expect(
      service.execute(ip, () => Promise.resolve()),
    ).rejects.toMatchObject({ status: 429 });
  });
});
