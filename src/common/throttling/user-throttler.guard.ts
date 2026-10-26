import { ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';

const jwt = new JwtService();

/**
 * Rate limits per signed-in account instead of per IP address.
 *
 * The default tracker is `req.ip`. Behind Render's proxy (and without `trust proxy`) that is the proxy's address,
 * so every learner shared the same buckets: one learner's AI requests returned 429 to everyone else. A request that
 * carries a valid learner or admin token is now tracked by its account; anything else by the client IP (the real
 * one once `trust proxy` is set, see main.ts). Tokens are verified (not just decoded) so a forged token cannot be
 * used to get a fresh bucket.
 */
export function trackerFor(req: { headers?: Record<string, unknown>; ip?: string }, secrets = tokenSecrets()): string {
  const auth = req.headers?.authorization;
  const token = typeof auth === 'string' && auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (token) {
    for (const [scope, secret] of secrets) {
      try {
        const payload = jwt.verify<{ sub?: unknown; id?: unknown }>(token, { secret });
        const id = payload.sub ?? payload.id;
        if (typeof id === 'string' && id) return `${scope}:${id}`;
      } catch {
        // not signed with this secret, or expired
      }
    }
  }
  return `ip:${req.ip ?? 'unknown'}`;
}

function tokenSecrets(): [string, string][] {
  const out: [string, string][] = [];
  if (process.env.JWT_SECRET) out.push(['user', process.env.JWT_SECRET]);
  if (process.env.ADMIN_JWT_SECRET) out.push(['admin', process.env.ADMIN_JWT_SECRET]);
  return out;
}

@Injectable()
export class UserAwareThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return trackerFor(req);
  }

  /** A standard `Retry-After` header (the library only sets `Retry-After-<name>`) and a body clients can act on. */
  protected async throwThrottlingException(context: ExecutionContext, detail: { timeToBlockExpire: number; timeToExpire: number }): Promise<void> {
    const seconds = Math.max(1, Math.ceil(detail.timeToBlockExpire || detail.timeToExpire || 1));
    context.switchToHttp().getResponse()?.header?.('Retry-After', String(seconds));
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        error: 'Too Many Requests',
        code: 'RATE_LIMITED',
        retryAfterSeconds: seconds,
        message: `You're going a bit fast. Please wait ${seconds} second${seconds === 1 ? '' : 's'} and try again.`,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
