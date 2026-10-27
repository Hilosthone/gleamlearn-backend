-- PROPOSED MIGRATION: NOT EXECUTED ON PRODUCTION. Requires explicit approval before running there.
-- Applied only to the disposable local database gleamlearn_e2e (test/live/apply-sql.mjs) for testing.
--
-- Adds four NEW tables for learner-owned content. No existing table or row is changed.
--   "user_avatars"             one row per learner who chose an avatar or uploaded a picture (none = default)
--   "personal_courses"         private courses a learner creates for themselves (never in the public catalogue)
--   "personal_course_modules"  modules/topics inside a personal course, with notes and a done flag
--   "learner_materials"        files a learner uploaded (stored privately; only storage keys are kept here)
--
-- Code/order: the backend that uses these tables can be deployed BEFORE this migration. Until it runs, the new
-- routes answer 501 FEATURE_UNAVAILABLE (src/common/errors/missing-table.ts) and nothing else is affected.
-- Uploaded bytes are NOT stored in the database (Cloudinary "authenticated" storage, see src/storage).
--
-- Guarantees: idempotent (IF NOT EXISTS), one transaction, no foreign keys (cannot fail on existing data; ownership
-- is enforced by every query filtering on "userId" from the signed-in token).
-- Requires: gen_random_uuid() (PostgreSQL 13+, or the pgcrypto extension).

-- ---------- Read-only pre-check ----------
-- SELECT to_regclass('public.user_avatars'), to_regclass('public.personal_courses'),
--        to_regclass('public.personal_course_modules'), to_regclass('public.learner_materials');   -- all NULL expected
-- SHOW server_version;

BEGIN;

CREATE TABLE IF NOT EXISTS "user_avatars" (
  "userId"     uuid         PRIMARY KEY,
  "kind"       varchar(10)  NOT NULL,
  "presetId"   varchar(40)  NULL,
  "storageKey" varchar(500) NULL,
  "mimeType"   varchar(50)  NULL,
  "updatedAt"  timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT "CHK_user_avatars_kind" CHECK ("kind" IN ('preset', 'upload'))
);

CREATE TABLE IF NOT EXISTS "personal_courses" (
  "id"          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"      uuid         NOT NULL,
  "title"       varchar(200) NOT NULL,
  "description" text         NULL,
  "subjects"    jsonb        NOT NULL DEFAULT '[]',
  "level"       varchar(100) NULL,
  "examGoals"   jsonb        NOT NULL DEFAULT '[]',
  "createdAt"   timestamptz  NOT NULL DEFAULT now(),
  "updatedAt"   timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IDX_personal_courses_userId" ON "personal_courses" ("userId");

CREATE TABLE IF NOT EXISTS "personal_course_modules" (
  "id"          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  "courseId"    uuid         NOT NULL,
  "userId"      uuid         NOT NULL,
  "title"       varchar(200) NOT NULL,
  "notes"       text         NULL,
  "position"    integer      NOT NULL DEFAULT 0,
  "isCompleted" boolean      NOT NULL DEFAULT false,
  "createdAt"   timestamptz  NOT NULL DEFAULT now(),
  "updatedAt"   timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IDX_personal_course_modules_courseId" ON "personal_course_modules" ("courseId");

CREATE TABLE IF NOT EXISTS "learner_materials" (
  "id"               uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"           uuid         NOT NULL,
  "personalCourseId" uuid         NULL,
  "originalName"     varchar(255) NOT NULL,
  "mimeType"         varchar(100) NOT NULL,
  "sizeBytes"        integer      NOT NULL,
  "storageKey"       varchar(500) NOT NULL,
  "status"           varchar(20)  NOT NULL DEFAULT 'READY',
  "createdAt"        timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IDX_learner_materials_userId" ON "learner_materials" ("userId");

COMMIT;

-- ---------- Post-check (read-only) ----------
-- SELECT table_name FROM information_schema.tables
--   WHERE table_name IN ('user_avatars', 'personal_courses', 'personal_course_modules', 'learner_materials') ORDER BY 1;

-- ---------- Rollback (only if needed). Deletes every avatar choice, personal course and material RECORD; ----------
-- ---------- the uploaded objects stay in Cloudinary (gleamlearn-avatars/, gleamlearn-materials/) until removed. ----------
-- BEGIN;
-- DROP TABLE IF EXISTS "learner_materials";
-- DROP TABLE IF EXISTS "personal_course_modules";
-- DROP TABLE IF EXISTS "personal_courses";
-- DROP TABLE IF EXISTS "user_avatars";
-- COMMIT;
