import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Per-request context, available to code that has no access to `req`:
 *   - the authenticated account (the AI-service HTTP client forwards it so the AI service can rate-limit per learner
 *     instead of treating every learner as one caller: the backend);
 *   - a request id, sent to the AI service as X-Request-Id and returned to the client, so one request can be
 *     followed through the backend's and the AI service's logs.
 */
interface RequestContext {
  userId?: string;
  requestId?: string;
}
const storage = new AsyncLocalStorage<RequestContext>();

export const currentUserId = (): string | undefined => storage.getStore()?.userId;
export const currentRequestId = (): string | undefined => storage.getStore()?.requestId;

export function runWithUser<T>(userId: string, fn: () => T): T {
  return storage.run({ ...storage.getStore(), userId }, fn);
}

export function runWithContext<T>(ctx: RequestContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export const REQUEST_ID_HEADER = 'X-Request-Id';
const VALID_REQUEST_ID = /^[A-Za-z0-9._-]{8,64}$/;

/** A caller-supplied id is kept only when it is short and plain (it ends up in logs); otherwise a new one is made. */
export function requestIdFrom(header: unknown): string {
  const value = Array.isArray(header) ? header[0] : header;
  return typeof value === 'string' && VALID_REQUEST_ID.test(value) ? value : randomUUID();
}

/** Backend routes that call the AI service: their start and end are logged (method, path, status, duration only). */
const AI_ROUTE =
  /^\/api\/v1\/(ai\/|ai-tutor\/|learning\/generate$|youtube-sessions\/[^/]+\/ask$|(quizzes|tests|exams)\/generate[a-z-]*$|youtube\/[^/]+\/(re)?process$)/;
export const isAiRoute = (path: string) => AI_ROUTE.test(path);

/** Global interceptor (after guards, so `req.user` is set): runs the handler inside the request context. */
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AiRequest');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();
    const user = req?.user;
    const userId: unknown = user?.id ?? user?.userId;
    const requestId = requestIdFrom(req?.headers?.['x-request-id']);
    res?.setHeader?.(REQUEST_ID_HEADER, requestId);

    const method = String(req?.method ?? '');
    const path = String(req?.originalUrl ?? req?.url ?? '').split('?')[0];
    const traced = isAiRoute(path);
    const started = Date.now();
    if (traced) this.logger.log(`ai.route.received id=${requestId} ${method} ${path}`);

    const ctx: RequestContext = { requestId, ...(typeof userId === 'string' && userId ? { userId } : {}) };
    // the handler runs when the observable is subscribed, so subscribe inside the context
    return new Observable((subscriber) =>
      runWithContext(ctx, () =>
        next.handle().subscribe({
          next: (value) => subscriber.next(value),
          error: (err) => {
            if (traced) {
              const status = typeof err?.getStatus === 'function' ? err.getStatus() : 500;
              const body = typeof err?.getResponse === 'function' ? err.getResponse() : undefined;
              const code = body && typeof body === 'object' && 'code' in body ? (body as { code: unknown }).code : 'none';
              this.logger.warn(`ai.route.failed id=${requestId} ${method} ${path} status=${status} code=${code} ms=${Date.now() - started}`);
            }
            subscriber.error(err);
          },
          complete: () => {
            if (traced) this.logger.log(`ai.route.completed id=${requestId} ${method} ${path} status=${res?.statusCode ?? 'unknown'} ms=${Date.now() - started}`);
            subscriber.complete();
          },
        }),
      ),
    );
  }
}
