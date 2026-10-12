// src/auth/one-time-code.ts
import { timingSafeEqual } from 'node:crypto';

/**
 * Binding of 6-digit verification / password-reset codes to ONE account.
 *
 * Before: POST /auth/verify-email and /auth/reset-password looked the user up by the code alone, so every
 * guess was tested against every account with a pending code, and nothing limited guesses per account.
 * Now the request must name the account (`email`), the code is compared in constant time, and after
 * MAX_CODE_FAILURES wrong codes the pending code is cleared, so a new one must be requested.
 *
 * Compatibility switch: AUTH_CODE_REQUIRES_EMAIL=false temporarily accepts requests without `email`
 * (old behaviour, NOT recommended) for clients that have not been updated yet. Default: required.
 */
export const MAX_CODE_FAILURES = 5;

export function codeRequiresEmail(): boolean {
  return (process.env.AUTH_CODE_REQUIRES_EMAIL ?? 'true').trim().toLowerCase() !== 'false';
}

export function codesMatch(expected: string | null | undefined, provided: unknown): boolean {
  if (typeof expected !== 'string' || !expected || typeof provided !== 'string') return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(provided.trim());
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Wrong-code counter per account. In memory: it resets on restart and is per instance, so it limits
 * guessing per issued code but is not a durable lockout (that needs a column → migration, see changelog).
 * The IP throttles on the routes still apply.
 */
export class CodeFailureTracker {
  private readonly failures = new Map<string, number>();

  /** Records a wrong code; returns true when the limit is reached (the caller must clear the code). */
  recordFailure(userId: string): boolean {
    const n = (this.failures.get(userId) ?? 0) + 1;
    if (n >= MAX_CODE_FAILURES) {
      this.failures.delete(userId);
      return true;
    }
    this.failures.set(userId, n);
    return false;
  }

  reset(userId: string): void {
    this.failures.delete(userId);
  }
}
