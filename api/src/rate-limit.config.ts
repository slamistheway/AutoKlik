import type { ThrottlerModuleOptions } from '@nestjs/throttler';

export const RATE_LIMIT_OPTIONS: ThrottlerModuleOptions = {
  generateKey: (_context, tracker, name) => `${name}:${tracker}`,
  throttlers: [
    { name: 'default', limit: 120, ttl: 60000, blockDuration: 10000 },
    { name: 'burst', limit: 30, ttl: 1000, blockDuration: 1000 },
  ],
  errorMessage: (_context, detail) =>
    `Previše zahtjeva. Pokušajte ponovno za ${detail.timeToBlockExpire} s.`,
};
