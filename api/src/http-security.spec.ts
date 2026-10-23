import type { ForbiddenException } from '@nestjs/common';
import { allowedOrigins, securityMiddleware } from './http-security';
import type { Request, Response } from 'express';

describe('HTTP security', () => {
  const origin = 'https://autoklik.example';
  const run = (headers: Record<string, string>, method = 'POST') => {
    const response = { setHeader: jest.fn() };
    const next = jest.fn<void, [error?: ForbiddenException]>();
    securityMiddleware([origin])(
      { headers, method, path: '/users/me', secure: true } as Request,
      response as unknown as Response,
      next,
    );
    return { next, response };
  };

  it('rejects browser mutations from an untrusted or null origin', () => {
    for (const value of [
      'https://evil.example',
      'null',
      `${origin}.evil.example`,
    ]) {
      expect(run({ origin: value }).next.mock.calls[0][0]?.getStatus()).toBe(
        403,
      );
    }
  });

  it('requires an allowed origin for cookie-only mutations', () => {
    expect(
      run({ cookie: 'session=secret' }).next.mock.calls[0][0]?.getStatus(),
    ).toBe(403);
    expect(
      run({ cookie: 'session=secret', origin }).next,
    ).toHaveBeenCalledWith();
    expect(run({ authorization: 'Bearer secret' }).next).toHaveBeenCalledWith();
    expect(run({}, 'GET').next).toHaveBeenCalledWith();
  });

  it('sets no-sniff, framing, cache and HTTPS protections', () => {
    const { response } = run({ origin });
    expect(response.setHeader).toHaveBeenCalledWith(
      'X-Content-Type-Options',
      'nosniff',
    );
    expect(response.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    expect(response.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'no-store',
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'Strict-Transport-Security',
      'max-age=31536000',
    );
  });

  it('shares explicit HTTPS origins in production and refuses unsafe configuration', () => {
    expect(
      allowedOrigins({
        NODE_ENV: 'production',
        FRONTEND_URL: origin,
        ADMIN_URL: 'https://admin.example/',
      }),
    ).toEqual([origin, 'https://admin.example']);
    for (const url of [
      'http://autoklik.example',
      `${origin}/path`,
      'https://user:pass@autoklik.example',
      `${origin}?x=1`,
    ]) {
      expect(() =>
        allowedOrigins({ NODE_ENV: 'production', FRONTEND_URL: url }),
      ).toThrow();
    }
    expect(() => allowedOrigins({ NODE_ENV: 'production' })).toThrow();
  });
});
