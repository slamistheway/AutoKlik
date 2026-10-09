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
    if (!user || !['POST', 'PATCH', 'DELETE'].includes(method))
      return next.handle();

    return next.handle().pipe(
      mergeMap(async (response) => {
        const userId = Number(user.id);
        if (!Number.isSafeInteger(userId) || userId <= 0) return response;

        try {
          await this.auditService.record(
            method,
            request.originalUrl,
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
