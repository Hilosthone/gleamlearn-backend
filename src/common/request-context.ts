import { AsyncLocalStorage } from 'node:async_hooks';
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * The authenticated account for the current request, available to code that has no access to `req` (for example
 * the AI-service HTTP client, which forwards it so the AI service can rate-limit per learner instead of treating
 * every learner as one caller: the backend).
 */
const storage = new AsyncLocalStorage<{ userId: string }>();

export const currentUserId = (): string | undefined => storage.getStore()?.userId;

export function runWithUser<T>(userId: string, fn: () => T): T {
  return storage.run({ userId }, fn);
}

/** Global interceptor (after guards, so `req.user` is set): runs the handler inside the request context. */
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const user = context.switchToHttp().getRequest()?.user;
    const userId: unknown = user?.id ?? user?.userId;
    if (typeof userId !== 'string' || !userId) return next.handle();
    // the handler runs when the observable is subscribed, so subscribe inside the context
    return new Observable((subscriber) => runWithUser(userId, () => next.handle().subscribe(subscriber)));
  }
}
