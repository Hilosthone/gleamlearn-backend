// src/common/security/otp.ts
import { randomInt } from 'node:crypto';

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60 * 1000;

/**
 * Generates a 6-digit one-time code (100000–999999, the same range as before) using the
 * cryptographically secure generator from node:crypto. Math.random() is predictable and
 * must never be used for codes that grant account access (verification and password reset
 * codes share the same column, so both are security-sensitive).
 *
 * Never log the returned value.
 */
export function generateOtp(): string {
  return randomInt(100_000, 1_000_000).toString();
}
