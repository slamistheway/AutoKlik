import { ForbiddenException } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';

export function allowedOrigins(
  environment: NodeJS.ProcessEnv = process.env,
): string[] {
  const production = environment.NODE_ENV === 'production';
  const values = production
    ? [environment.FRONTEND_URL, environment.ADMIN_URL]
    : [
        environment.FRONTEND_URL ?? 'http://localhost:3000',
        environment.ADMIN_URL ?? 'http://localhost:3003',
        'http://localhost:4200',
      ];
  if (production && !environment.FRONTEND_URL)
    throw new Error('FRONTEND_URL is required in production');
  return [
    ...new Set(
      values
        .filter((value): value is string => Boolean(value))
        .map((value) => {
          const url = new URL(value);
          if (
            !['http:', 'https:'].includes(url.protocol) ||
            url.username ||
            url.password ||
            url.search ||
            url.hash ||
            url.pathname !== '/' ||
            (production && url.protocol !== 'https:')
          ) {
            throw new Error(
              'Frontend and admin URLs must be origins; production requires HTTPS',
            );
          }
          return url.origin;
        }),
    ),
  ];
}

export function securityMiddleware(origins: string[]) {
  const allowed = new Set(origins);
  return (request: Request, response: Response, next: NextFunction) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; frame-ancestors 'none'; sandbox",
    );
    if (request.secure)
      response.setHeader('Strict-Transport-Security', 'max-age=31536000');
    if (
      request.headers.authorization ||
      request.headers.cookie ||
      request.path.startsWith('/users/')
    )
      response.setHeader('Cache-Control', 'no-store');

    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      const origin = request.headers.origin;
      // CORS alone does not stop a browser submitting a cross-site form.
      const cookieAuthentication =
        request.headers.cookie && !request.headers.authorization;
      if (
        (origin && !allowed.has(origin)) ||
        (!origin && cookieAuthentication)
      ) {
        return next(new ForbiddenException('Izvor zahtjeva nije dopušten.'));
      }
    }
    next();
  };
}

export function configureHttpSecurity(app: NestExpressApplication) {
  const origins = allowedOrigins();
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.use(securityMiddleware(origins));
  app.useBodyParser('json', { limit: '64kb' });
  app.useBodyParser('urlencoded', {
    limit: '64kb',
    extended: false,
    parameterLimit: 60,
  });
  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    exposedHeaders: ['Retry-After', 'Retry-After-burst'],
  });
}
