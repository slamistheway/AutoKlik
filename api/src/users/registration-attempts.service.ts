import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { LoginAttemptsService } from './login-attempts.service';

type Registrations = { successes: number[]; pending: number };

@Injectable()
export class RegistrationAttemptsService {
  private readonly registrations = new Map<string, Registrations>();
  private nextCleanup = 0;

  constructor(private readonly attempts: LoginAttemptsService) {}

  async execute<T>(ip: string, register: () => Promise<T>): Promise<T> {
    const now = Date.now();
    if (now >= this.nextCleanup) {
      for (const [key, state] of this.registrations) {
        state.successes = state.successes.filter(
          (time) => time > now - 3600000,
        );
        if (!state.pending && !state.successes.length)
          this.registrations.delete(key);
      }
      this.nextCleanup = now + 60000;
    }
    const key = `registration:${ip}`;
    this.attempts.assertAvailable(key);
    const state = this.registrations.get(ip) ?? { successes: [], pending: 0 };
    state.successes = state.successes.filter((time) => time > now - 3600000);
    if (state.successes.length + state.pending >= 3) {
      const retryAfter = state.successes.length
        ? Math.max(1, Math.ceil((state.successes[0] + 3600000 - now) / 1000))
        : 1;
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Najviše 3 uspješne registracije po satu. Pokušajte ponovno za ${retryAfter} s.`,
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    state.pending++;
    this.registrations.set(ip, state);
    try {
      const result = await register();
      state.successes.push(Date.now());
      this.attempts.reset(key);
      return result;
    } catch (error) {
      if (
        error instanceof HttpException &&
        [400, 401, 409, 422].includes(error.getStatus())
      ) {
        this.attempts.recordFailure(key);
      }
      throw error;
    } finally {
      state.pending--;
    }
  }
}
