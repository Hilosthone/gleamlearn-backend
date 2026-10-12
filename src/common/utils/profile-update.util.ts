// src/common/utils/profile-update.util.ts
import { BadRequestException } from '@nestjs/common';

// Fields a user may change on their own basic profile (PATCH /auth/me, PATCH /users/me).
// Anything else in the request body (passwordHash, isEmailVerified, isRestricted, role, tokens, ...) is ignored.
export const BASIC_PROFILE_FIELDS = ['fullName', 'username', 'dateOfBirth', 'country'] as const;

export const ACADEMIC_PROFILE_FIELDS = [
  'educationType',
  'secondarySchool',
  'secondaryStream',
  'university',
  'faculty',
  'department',
  'courseOfStudy',
  'levelOrClass',
  'examAimOrGoals',
] as const;

export const PREFERENCE_FIELDS = ['preferredLearningPace', 'preferredStudyTime'] as const;

export function pickAllowed(source: unknown, allowed: readonly string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (!source || typeof source !== 'object') return result;
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(source, key) && (source as any)[key] !== undefined) {
      result[key] = (source as any)[key];
    }
  }
  return result;
}

/**
 * Builds the safe basic-profile update.
 * - Legacy `name` (documented on the old auth DTO) maps to `fullName` when `fullName` is absent.
 * - Email cannot be changed here: a different email is rejected because no verified
 *   email-change flow exists yet; resending the current email is ignored.
 */
export function buildBasicProfileUpdate(body: unknown, currentEmail?: string | null): Record<string, unknown> {
  const update = pickAllowed(body, BASIC_PROFILE_FIELDS);
  const raw = (body ?? {}) as Record<string, unknown>;

  if (update.fullName === undefined && typeof raw.name === 'string') {
    update.fullName = raw.name;
  }

  if (typeof raw.email === 'string') {
    const requested = raw.email.trim().toLowerCase();
    const current = (currentEmail ?? '').trim().toLowerCase();
    if (requested && requested !== current) {
      throw new BadRequestException(
        'Email address cannot be changed from the profile. Email changes require verification of the new address.',
      );
    }
  }

  return update;
}
