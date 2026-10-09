import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { mergeMap, type Observable } from 'rxjs';
import { AuditService } from '../audit.service';

type AuthenticatedRequest = {
  method: string;
  originalUrl: string;
  ip?: string;
  socket: { remoteAddress?: string };
  user?: { id: number | string };
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly auditService: AuditService) {}

  intercept<T>(context: ExecutionContext, next: CallHandler<T>): Observable<T> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { method, user } = request;
    const path = request.originalUrl.split('?')[0].replace(/\/$/, '');
    // Logout is recorded atomically with token revocation.
    if (method === 'POST' && path === '/users/logout') return next.handle();
    if (!user || !['POST', 'PATCH', 'DELETE'].includes(method))
      return next.handle();

    return next.handle().pipe(
      mergeMap(async (response) => {
        const userId = Number(user.id);
        if (!Number.isSafeInteger(userId) || userId <= 0) return response;

        try {
          await this.auditService.record(
            method === 'PATCH' && /^\/ads\/\d+$/.test(path) ? 'ad_update' :
              method === 'PATCH' && path === '/users/me' ? 'profile_update' :
              method === 'POST' && path === '/users/me/upload-pfp' ? 'profile_image_update' :
              method === 'POST' && path === '/ads' ? 'ad_create' :
              method === 'DELETE' && /^\/ads\/(?:delete\/)?\d+$/.test(path) ? 'ad_delete' : method,
            path,
            userId,
            request.ip ?? request.socket.remoteAddress ?? null,
          );
        } catch (error) {
          this.logger.error(
            'Could not save audit log',
            error instanceof Error ? error.stack : undefined,
          );
        }
        return response;
      }),
    );
  }
}
