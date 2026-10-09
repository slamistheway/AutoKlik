import { Catch, Injectable, Logger } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import type { Request } from 'express';
import { AuditService } from './audit.service';

@Catch()
@Injectable()
export class AuthAuditExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(AuthAuditExceptionFilter.name);

  constructor(
    adapter: HttpAdapterHost,
    private readonly audit: AuditService,
  ) {
    super(adapter.httpAdapter);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    void this.recordFailure(host).then(() => super.catch(exception, host));
  }

  private async recordFailure(host: ArgumentsHost) {
    const request = host.switchToHttp().getRequest<Request>();
    const path = request.originalUrl.split('?')[0].replace(/\/$/, '');
    if (
      request.method === 'POST' &&
      ['/users/login', '/users/register'].includes(path)
    ) {
      try {
        await this.audit.record(
          path === '/users/login' ? 'login_failed' : 'register_failed',
          path,
          null,
          request.ip ?? request.socket.remoteAddress ?? null,
        );
      } catch (error) {
        this.logger.error(
          'Could not record failed authentication attempt',
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }
}
