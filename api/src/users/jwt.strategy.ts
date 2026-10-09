import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import type { Request } from 'express';
import { SessionsService } from './sessions.service';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

const jwtSecret = process.env.JWT_SECRET ?? 'dev_jwt_secret';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly sessions: SessionsService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
      passReqToCallback: true,
    });
  }

  async validate(
    request: Request,
    payload: { id: number; email?: string; exp: number },
  ) {
    if (
      !Number.isSafeInteger(payload.id) ||
      payload.id <= 0 ||
      !Number.isFinite(payload.exp)
    ) {
      throw new UnauthorizedException();
    }
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
    if (!token) throw new UnauthorizedException();
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await this.sessions.assertActive(tokenHash);
    return {
      id: payload.id,
      email: payload.email,
      exp: payload.exp,
      tokenHash,
    };
  }
}
