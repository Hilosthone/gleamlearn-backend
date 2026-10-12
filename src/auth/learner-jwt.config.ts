// src/auth/learner-jwt.config.ts
import { ServiceUnavailableException } from '@nestjs/common';

/**
 * Learner JWT secret. There is deliberately NO hard-coded fallback: the previous fallback value was
 * published in the (public) repository, so any deployment missing JWT_SECRET accepted tokens anyone could
 * forge. When JWT_SECRET is missing, learner sign-in answers 503 and learner tokens are rejected (fail closed);
 * the rest of the application keeps running.
 */
export const LEARNER_AUTH_NOT_CONFIGURED = 'Learner authentication is not configured.';

export function readLearnerJwtSecret(get: (key: string) => string | undefined): string | null {
  const secret = (get('JWT_SECRET') ?? '').trim();
  return secret ? secret : null;
}

export function requireLearnerJwtSecret(get: (key: string) => string | undefined = (k) => process.env[k]): string {
  const secret = readLearnerJwtSecret(get);
  if (!secret) throw new ServiceUnavailableException(LEARNER_AUTH_NOT_CONFIGURED);
  return secret;
}
