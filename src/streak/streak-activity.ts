import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, mergeMap } from 'rxjs';
import { StreakService } from './streak.service.js';

export const STREAK_ACTIVITY_KEY = 'streak:activity';

/**
 * Marks a learner route as learning activity that counts towards the streak (e.g. completing a lesson).
 * The day is recorded only after the route succeeds, for the authenticated learner making the request.
 */
export const CountsTowardStreak = (source: string) => SetMetadata(STREAK_ACTIVITY_KEY, source);

/** Global interceptor (registered in StreakModule) that records the day for routes marked with CountsTowardStreak. */
@Injectable()
export class StreakActivityInterceptor implements NestInterceptor {
  private readonly logger = new Logger(StreakActivityInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly streaks: StreakService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const source = this.reflector.get<string | undefined>(STREAK_ACTIVITY_KEY, context.getHandler());
    if (!source || context.getType() !== 'http') return next.handle();
    const user = context.switchToHttp().getRequest()?.user;
    const userId: unknown = user?.id ?? user?.userId;
    if (typeof userId !== 'string' || !userId) return next.handle();

    return next.handle().pipe(
      mergeMap(async (body) => {
        // after success only; a streak problem must never fail the learning action itself
        try {
          await this.streaks.recordActivity(userId, source);
        } catch (err) {
          this.logger.error(`streak not recorded for ${source}: ${(err as Error).message}`);
        }
        return body;
      }),
    );
  }
}
