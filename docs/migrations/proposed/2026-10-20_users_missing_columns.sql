-- =====================================================================================
-- PROPOSED, NOT EXECUTED: add the users columns the login code needs (Known Issue P0)
-- =====================================================================================
-- Status: DRAFT. Do not run until:
--   1. docs/diagnostics/users-schema-inspection.sql has been run in the Supabase SQL Editor, AND
--   2. its section 3 has listed the exact MISSING column(s), AND
--   3. the owner has approved this change.
-- Then run ONLY the block(s) for the column(s) that query 3 listed, and delete the rest.
--
-- Why these definitions: each block matches src/auth/entities/user.entity.ts exactly
-- (same name, type, nullability and default), so TypeORM queries work without code changes.
--
-- Impact: ADD COLUMN with a constant DEFAULT (or nullable, no default) is a metadata-only
-- change in PostgreSQL 11+: no table rewrite, no long lock, existing rows are untouched.
-- Existing rows get NULL (nullable columns) or the default (false / now()).
-- No data is deleted. Rollback only drops a column that this script added (it was empty).
--
-- If query 4 shows the column exists under ANOTHER name (e.g. "createdAt" instead of
-- "created_at"), do NOT add a duplicate: tell the developer, and the entity mapping will be
-- changed instead (code change, no migration).
-- =====================================================================================

-- DECISION TABLE (apply only what section 3 of docs/diagnostics/users-schema-inspection.sql shows)
-- -------------------------------------------------------------------------------------------------
-- | Section 3 shows                                         | Smallest correction                   |
-- |---------------------------------------------------------|---------------------------------------|
-- | nothing (all 'ok')                                      | NOT a schema problem: check section 6  |
-- |                                                         | (privileges/RLS) and the Render log    |
-- | created_at / updated_at MISSING, similar: createdAt /   | NO migration: map the auth entity to   |
-- |   updatedAt                                             | the existing "createdAt"/"updatedAt"   |
-- |                                                         | columns (code change, reviewed, tested)|
-- | verification_otp, otp_expires_at, refresh_token,        | Add ONLY those columns (blocks below). |
-- |   is_restricted, restriction_reason MISSING (no twin)   | No equivalent exists; OTP, reset and   |
-- |                                                         | restrictions need them.                |
-- | any other column MISSING with a similar_named_column    | Mapping fix in code, not a new column  |
-- | TYPE DIFFERS                                            | Stop: review the specific column first |
-- -------------------------------------------------------------------------------------------------
-- Predicted (from git history, NOT yet confirmed): the 7 columns added to the auth entity on
-- 2026-10-01 (verification_otp, otp_expires_at, refresh_token, is_restricted, restriction_reason,
-- created_at, updated_at), because every synchronize deploy after users existed failed on the
-- conflicting fullName definitions and Render kept the previous deploy running.

BEGIN;

-- ---------- nullable text columns (safe: NULL for existing rows) ----------
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "verification_otp"   varchar   NULL;
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "otp_expires_at"     timestamp NULL;
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "refresh_token"      text      NULL;
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "restriction_reason" text      NULL;
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "secondarySchool"    varchar   NULL;
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "secondaryClass"     varchar   NULL;
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "secondaryStream"    varchar   NULL;
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "university"         varchar   NULL;
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "faculty"            varchar   NULL;
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "courseOfStudy"      varchar   NULL;
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "level"              varchar   NULL;
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "examAimOrGoals"     varchar   NULL;
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "preferredStudyTime" varchar   NULL;

-- ---------- NOT NULL columns with a constant default (existing rows get the default) ----------
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "is_restricted"   boolean   NOT NULL DEFAULT false;
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "isEmailVerified" boolean   NOT NULL DEFAULT false;
-- Prefer the mapping fix (decision table) when createdAt / updatedAt exist. Only if they do NOT exist:
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "created_at"      timestamp NOT NULL DEFAULT now();
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "updated_at"      timestamp NOT NULL DEFAULT now();
--   NOTE (created_at / updated_at): existing rows get the migration time, not their real creation
--   time. If "createdAt"/"updatedAt" columns already exist, prefer copying them afterwards:
--   UPDATE users SET "created_at" = "createdAt" WHERE "createdAt" IS NOT NULL;   (data change: needs approval)

-- Verify inside the transaction before committing: this must return no rows
-- (section 3 of docs/diagnostics/users-schema-inspection.sql).

COMMIT;

-- =====================================================================================
-- ROLLBACK (only for columns this script added; they contain no user data at that point)
-- =====================================================================================
-- BEGIN;
-- ALTER TABLE public.users DROP COLUMN IF EXISTS "<column added above>";
-- COMMIT;
--
-- Verification after applying (owner, read-only):
--   1. Re-run docs/diagnostics/users-schema-inspection.sql → section 3 shows only 'ok'.
--   2. POST https://gleamlearn-backend.onrender.com/api/v1/auth/login with an unknown email → 401 (not 500).
--   3. POST .../auth/forgot-password with an unknown email → 201 (not 500).
--   4. Only then: a real sign-up with a test address (this creates one user row; approve first).
