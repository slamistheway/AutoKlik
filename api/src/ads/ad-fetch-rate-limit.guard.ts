import { Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectThrottlerStorage, ThrottlerGuard } from '@nestjs/throttler';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type { Request } from 'express';

type AdFetchRequest = Request & { user?: { id?: number } };

@Injectable()
export class AdFetchRateLimitGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerStorage() storage: ThrottlerStorage,
    @Inject(Reflector) reflector: Reflector,
  ) {
    super(
      {
        generateKey: (_context, tracker, name) => `${name}:${tracker}`,
        throttlers: [
          {
            name: 'ad-fetch',
            ttl: 60000,
            blockDuration: 60000,
            limit: (context) =>
              context.switchToHttp().getRequest<AdFetchRequest>().user?.id
                ? 140
                : 70,
          },
        ],
        errorMessage: (_context, detail) =>
          `Previše zahtjeva za oglase. Pokušajte ponovno za ${detail.timeToBlockExpire} s.`,
      },
      storage,
      reflector,
    );
  }

  protected async getTracker(req: AdFetchRequest): Promise<string> {
    return req.user?.id
      ? `user:${req.user.id}`
      : `ip:${await super.getTracker(req)}`;
  }
}
