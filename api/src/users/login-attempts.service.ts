import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

type Attempts = {
  failures: number;
  expiresAt: number;
  blockedUntil: number;
  lockouts: number;
  historyExpiresAt: number;
};

@Injectable()
export class LoginAttemptsService {
  private readonly attempts = new Map<string, Attempts>();
  private nextCleanup = 0;

  assertAvailable(key: string) {
    const now = Date.now();
    if (now >= this.nextCleanup) {
      for (const [storedKey, attempts] of this.attempts) {
        if (attempts.historyExpiresAt <= now) this.attempts.delete(storedKey);
      }
      this.nextCleanup = now + 60000;
    }
    const attempts = this.attempts.get(key);
    if (!attempts) return;
    if (attempts.blockedUntil > now) {
      const retryAfter = Math.ceil((attempts.blockedUntil - now) / 1000);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Previše neuspjelih pokušaja. Pokušajte ponovno za ${retryAfter} s.`,
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (attempts.blockedUntil || attempts.expiresAt <= now) {
      attempts.failures = 0;
      attempts.blockedUntil = 0;
    }
  }

  recordFailure(key: string) {
    this.assertAvailable(key);
    const failures = (this.attempts.get(key)?.failures ?? 0) + 1;
    const now = Date.now();
    const lockouts =
      (this.attempts.get(key)?.lockouts ?? 0) + (failures >= 10 ? 1 : 0);
    const cooldown = Math.min(
      24 * 60 * 60000,
      15 * 60000 * 2 ** Math.min(Math.max(0, lockouts - 1), 7),
    );
    const blockedUntil = failures >= 10 ? now + cooldown : 0;
    this.attempts.set(key, {
      failures,
      expiresAt: now + 15 * 60000,
      blockedUntil,
      lockouts,
      historyExpiresAt: Math.max(now, blockedUntil) + 24 * 60 * 60000,
    });
    this.assertAvailable(key);
  }

  reset(key: string) {
    const attempts = this.attempts.get(key);
    if (attempts) attempts.failures = 0;
  }
}
