// src/auth/email-identity.ts
import { Raw, type Repository } from 'typeorm';
import type { User } from './entities/user.entity.js';

/**
 * Emails identify accounts case-insensitively: `Ada@Example.com` and `ada@example.com` are the same learner.
 * New accounts are stored normalised (trimmed, lower case). Before this, the exact string was stored and
 * compared, so two accounts could differ only by case and sign-in failed on a different capitalisation.
 */
export function normalizeEmail(email: unknown): string {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

/**
 * Finds the learner for an email. An exact match on the normalised form comes first (uses the unique index and
 * covers every account created since normalisation); accounts stored earlier with capitals are then matched
 * case-insensitively, so they keep working without a data migration.
 */
export async function findUserByEmail(repo: Repository<User>, email: unknown): Promise<User | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const exact = await repo.findOne({ where: { email: normalized } });
  if (exact) return exact;
  return repo.findOne({ where: { email: Raw((column) => `LOWER(${column}) = :normalized`, { normalized }) } });
}
