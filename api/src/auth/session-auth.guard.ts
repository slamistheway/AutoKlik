import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { BetterAuthService } from './better-auth.service';
type SessionRequest = Request & {
  user?: { id: number; email: string; sessionId: string };
};

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly auth: BetterAuthService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<SessionRequest>();
    const user = await this.auth.authenticate(request);
    if (!user) throw new UnauthorizedException('Niste prijavljeni.');
    request.user = user;
    return true;
  }
}

@Injectable()
export class OptionalSessionAuthGuard implements CanActivate {
  constructor(private readonly auth: BetterAuthService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<SessionRequest>();
    request.user = (await this.auth.authenticate(request)) ?? undefined;
    return true;
  }
}
