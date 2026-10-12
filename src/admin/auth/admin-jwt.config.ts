// src/admin/auth/admin-jwt.config.ts
import { Logger } from '@nestjs/common';

/** `type` claim values. Every verifier checks the claim, so one kind of token can never be used as another. */
export const LEARNER_TOKEN_TYPE = 'learner';
export const ADMIN_TOKEN_TYPE = 'admin';
export const ADMIN_PASSWORD_RESET_TOKEN_TYPE = 'admin_password_reset';

export const ADMIN_JWT_MIN_SECRET_LENGTH = 32;
export const DEFAULT_ADMIN_JWT_EXPIRES_IN = '8h';

type EnvReader = { get<T = string>(key: string): T | undefined };

const logger = new Logger('AdminJwtConfig');

/**
 * Returns the dedicated admin signing secret, or null when admin authentication must stay disabled.
 * There is deliberately NO fallback to JWT_SECRET or to a hard-coded value: a missing, short, or
 * reused secret disables admin login and all admin routes (HTTP 503) instead of weakening them.
 * The secret value is never logged.
 */
export function getAdminJwtSecret(config: EnvReader): string | null {
  const secret = (config.get<string>('ADMIN_JWT_SECRET') ?? '').trim();
  const learnerSecret = (config.get<string>('JWT_SECRET') ?? '').trim();
  if (!secret || secret.length < ADMIN_JWT_MIN_SECRET_LENGTH) return null;
  if (learnerSecret && secret === learnerSecret) return null;
  return secret;
}

/** Explains (by variable name only) why admin authentication is disabled; null when configured. */
export function describeAdminJwtProblem(config: EnvReader): string | null {
  const secret = (config.get<string>('ADMIN_JWT_SECRET') ?? '').trim();
  if (!secret) return 'ADMIN_JWT_SECRET is not set';
  if (secret.length < ADMIN_JWT_MIN_SECRET_LENGTH) return `ADMIN_JWT_SECRET is shorter than ${ADMIN_JWT_MIN_SECRET_LENGTH} characters`;
  if (secret === (config.get<string>('JWT_SECRET') ?? '').trim()) return 'ADMIN_JWT_SECRET must differ from JWT_SECRET';
  return null;
}

export function logAdminJwtStatus(config: EnvReader): void {
  const problem = describeAdminJwtProblem(config);
  if (problem) {
    logger.error(`Admin authentication is DISABLED: ${problem}. Learner features are unaffected.`);
  }
}

export function getAdminJwtExpiresIn(config: EnvReader): string {
  return (config.get<string>('ADMIN_JWT_EXPIRES_IN') ?? '').trim() || DEFAULT_ADMIN_JWT_EXPIRES_IN;
}
