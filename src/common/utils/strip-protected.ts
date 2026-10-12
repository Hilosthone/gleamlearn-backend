// src/common/utils/strip-protected.ts

/**
 * Fields a client must never set on its own records. Request bodies are not stripped globally
 * (the ValidationPipe runs with whitelist: false), so services that spread or Object.assign a body into an
 * entity must drop these first. Otherwise `id` can redirect a save to ANOTHER user's row and `userId` can
 * move or plant records in another account.
 */
export const PROTECTED_FIELDS = ['id', 'userId', 'ownerId', 'createdBy', 'createdAt', 'updatedAt', 'deletedAt'] as const;

export function stripProtectedFields<T>(body: T): Partial<T> {
  if (!body || typeof body !== 'object') return {};
  const copy: Record<string, unknown> = { ...(body as Record<string, unknown>) };
  for (const key of PROTECTED_FIELDS) delete copy[key];
  return copy as Partial<T>;
}
