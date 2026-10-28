-- =====================================================================================================================
-- GleamLearn production migration: learner content (2026-10-27) + self-service learning (2026-10-28), combined.
-- NOT EXECUTED BY ANYONE YET ON PRODUCTION. To be reviewed and run by the owner in the Supabase SQL Editor.
--
-- The same statements as, and in the order of:
--   1. docs/migrations/proposed/2026-10-27_learner_content.sql          (user_avatars, personal_courses,
--                                                                          personal_course_modules, learner_materials)
--   2. docs/migrations/proposed/2026-10-28_self_service_learning.sql   (columns the current backend also reads, and
--                                                                          generated lessons / quizzes / attempts /
--                                                                          YouTube Q&A tables)
-- Both are needed: the current backend selects personal_courses."objectives"/"archivedAt" and the new
-- learner_materials columns, so with only part 1 those routes would still answer 501.
--
-- What it does NOT do: no DROP, no TRUNCATE, no DELETE, no UPDATE of existing rows, no change to any existing table
-- (users, courses, admin_courses, library_saved_courses, files, decks, notes, youtube_resources, … are untouched).
-- The only ALTERs are on tables this same script creates.
--
-- How to run (Supabase → SQL Editor), in three separate runs:
--   STEP 1  the read-only PRE-FLIGHT block below. Stop if any result differs from "expected".
--   STEP 2  the APPLY block (BEGIN … COMMIT). It is all-or-nothing and safe to re-run (IF NOT EXISTS everywhere).
--   STEP 3  the read-only VERIFY block. Compare with "expected".
--   (STEP 4 is optional: Row Level Security, see the end of the file.)
-- =====================================================================================================================


-- =====================================================================================================================
-- STEP 1 — PRE-FLIGHT (read-only). Run alone first.
-- =====================================================================================================================

-- 1a. PostgreSQL version (expected: 13 or newer; Supabase is 15+) and gen_random_uuid() available (expected: 1 row)
SELECT current_setting('server_version') AS server_version;
SELECT proname FROM pg_proc WHERE proname = 'gen_random_uuid' LIMIT 1;

-- 1b. None of the eight new tables may exist yet. Expected: ALL eight columns NULL.
--     If any is NOT NULL, stop and send the output of 1d: the table exists already and must be compared first.
SELECT to_regclass('public.user_avatars')             AS user_avatars,
       to_regclass('public.personal_courses')         AS personal_courses,
       to_regclass('public.personal_course_modules')  AS personal_course_modules,
       to_regclass('public.learner_materials')        AS learner_materials,
       to_regclass('public.learning_resources')       AS learning_resources,
       to_regclass('public.learner_assessments')      AS learner_assessments,
       to_regclass('public.assessment_attempts')      AS assessment_attempts,
       to_regclass('public.youtube_session_messages') AS youtube_session_messages;

-- 1c. None of the index / constraint names used below may already exist on another table. Expected: 0 rows.
SELECT c.relname AS existing_name, c.relkind
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname IN (
  'IDX_personal_courses_userId', 'IDX_personal_course_modules_courseId', 'IDX_learner_materials_userId',
  'IDX_learner_materials_course', 'IDX_learning_resources_user', 'IDX_learning_resources_course',
  'UQ_learning_resources_request', 'IDX_learner_assessments_user', 'IDX_learner_assessments_course',
  'UQ_learner_assessments_request', 'IDX_assessment_attempts_user', 'IDX_assessment_attempts_assessment',
  'UQ_assessment_attempts_open', 'IDX_youtube_session_messages_session')
UNION ALL
SELECT conname, 'constraint' FROM pg_constraint WHERE conname = 'CHK_user_avatars_kind';

-- 1d. Only if 1b found an existing table: its columns, to compare with this script before going on.
-- SELECT table_name, column_name, data_type, is_nullable, column_default FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name IN ('user_avatars', 'personal_courses', 'personal_course_modules',
--     'learner_materials', 'learning_resources', 'learner_assessments', 'assessment_attempts', 'youtube_session_messages')
--   ORDER BY table_name, ordinal_position;

-- 1e. Information only (not required by this script): the existing tables some features build on.
--     youtube_resources → YouTube sessions; decks + flashcards → generated flashcards; notes → search.
--     A NULL here means that feature answers 501 until its own table exists; avatars, courses and materials do not
--     depend on them.
SELECT to_regclass('public.users') AS users, to_regclass('public.youtube_resources') AS youtube_resources,
       to_regclass('public.decks') AS decks, to_regclass('public.flashcards') AS flashcards,
       to_regclass('public.notes') AS notes;


-- =====================================================================================================================
-- STEP 2 — APPLY. Run this block alone, after STEP 1 looked as expected.
-- =====================================================================================================================

BEGIN;

-- fail fast instead of waiting behind another session's lock; the whole block then rolls back
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- ---------- Part 1: 2026-10-27 learner content ----------

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

-- ---------- Part 2: 2026-10-28 self-service learning ----------

ALTER TABLE "learner_materials" ADD COLUMN IF NOT EXISTS "sourceType" varchar(20) NOT NULL DEFAULT 'upload';
ALTER TABLE "learner_materials" ADD COLUMN IF NOT EXISTS "extractedText" text NULL;
ALTER TABLE "learner_materials" ADD COLUMN IF NOT EXISTS "textChars" integer NOT NULL DEFAULT 0;
ALTER TABLE "learner_materials" ADD COLUMN IF NOT EXISTS "processingError" text NULL;
ALTER TABLE "learner_materials" ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz NOT NULL DEFAULT now();
ALTER TABLE "learner_materials" ALTER COLUMN "storageKey" DROP NOT NULL;
CREATE INDEX IF NOT EXISTS "IDX_learner_materials_course" ON "learner_materials" ("personalCourseId");

ALTER TABLE "personal_courses" ADD COLUMN IF NOT EXISTS "objectives" jsonb NOT NULL DEFAULT '[]';
ALTER TABLE "personal_courses" ADD COLUMN IF NOT EXISTS "archivedAt" timestamptz NULL;

CREATE TABLE IF NOT EXISTS "learning_resources" (
  "id"               uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"           uuid         NOT NULL,
  "requestId"        uuid         NULL,
  "kind"             varchar(30)  NOT NULL,
  "title"            varchar(255) NOT NULL,
  "content"          text         NOT NULL,
  "sourceType"       varchar(20)  NOT NULL,
  "materialId"       uuid         NULL REFERENCES "learner_materials" ("id") ON DELETE SET NULL,
  "personalCourseId" uuid         NULL REFERENCES "personal_courses" ("id") ON DELETE SET NULL,
  "moduleId"         uuid         NULL REFERENCES "personal_course_modules" ("id") ON DELETE SET NULL,
  "youtubeSessionId" uuid         NULL,
  "options"          jsonb        NOT NULL DEFAULT '{}',
  "truncated"        boolean      NOT NULL DEFAULT false,
  "completedAt"      timestamptz  NULL,
  "createdAt"        timestamptz  NOT NULL DEFAULT now(),
  "updatedAt"        timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IDX_learning_resources_user" ON "learning_resources" ("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "IDX_learning_resources_course" ON "learning_resources" ("personalCourseId");
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_learning_resources_request" ON "learning_resources" ("userId", "requestId") WHERE "requestId" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "learner_assessments" (
  "id"               uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"           uuid         NOT NULL,
  "requestId"        uuid         NULL,
  "kind"             varchar(10)  NOT NULL CHECK ("kind" IN ('quiz', 'exam')),
  "title"            varchar(255) NOT NULL,
  "examType"         varchar(60)  NULL,
  "difficulty"       varchar(10)  NULL,
  "durationMinutes"  integer      NULL,
  "feedbackMode"     varchar(20)  NOT NULL DEFAULT 'after_submit',
  "questions"        jsonb        NOT NULL,
  "sourceType"       varchar(20)  NOT NULL,
  "materialId"       uuid         NULL REFERENCES "learner_materials" ("id") ON DELETE SET NULL,
  "personalCourseId" uuid         NULL REFERENCES "personal_courses" ("id") ON DELETE SET NULL,
  "moduleId"         uuid         NULL REFERENCES "personal_course_modules" ("id") ON DELETE SET NULL,
  "resourceId"       uuid         NULL REFERENCES "learning_resources" ("id") ON DELETE SET NULL,
  "youtubeSessionId" uuid         NULL,
  "requestedCount"   integer      NOT NULL,
  "truncated"        boolean      NOT NULL DEFAULT false,
  "createdAt"        timestamptz  NOT NULL DEFAULT now(),
  "updatedAt"        timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IDX_learner_assessments_user" ON "learner_assessments" ("userId", "kind", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "IDX_learner_assessments_course" ON "learner_assessments" ("personalCourseId");
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_learner_assessments_request" ON "learner_assessments" ("userId", "requestId") WHERE "requestId" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "assessment_attempts" (
  "id"             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"         uuid         NOT NULL,
  "assessmentId"   uuid         NOT NULL REFERENCES "learner_assessments" ("id") ON DELETE CASCADE,
  "status"         varchar(15)  NOT NULL DEFAULT 'in_progress' CHECK ("status" IN ('in_progress', 'submitted')),
  "answers"        jsonb        NOT NULL DEFAULT '{}',
  "score"          integer      NULL,
  "correctCount"   integer      NULL,
  "totalQuestions" integer      NOT NULL,
  "review"         jsonb        NULL,
  "startedAt"      timestamptz  NOT NULL DEFAULT now(),
  "deadlineAt"     timestamptz  NULL,
  "submittedAt"    timestamptz  NULL,
  "autoSubmitted"  boolean      NOT NULL DEFAULT false,
  "updatedAt"      timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IDX_assessment_attempts_user" ON "assessment_attempts" ("userId", "startedAt" DESC);
CREATE INDEX IF NOT EXISTS "IDX_assessment_attempts_assessment" ON "assessment_attempts" ("assessmentId");
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_assessment_attempts_open" ON "assessment_attempts" ("userId", "assessmentId") WHERE "status" = 'in_progress';

CREATE TABLE IF NOT EXISTS "youtube_session_messages" (
  "id"        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "sessionId" uuid        NOT NULL,
  "userId"    uuid        NOT NULL,
  "role"      varchar(10) NOT NULL CHECK ("role" IN ('user', 'assistant')),
  "content"   text        NOT NULL,
  "citations" jsonb       NOT NULL DEFAULT '[]',
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IDX_youtube_session_messages_session" ON "youtube_session_messages" ("sessionId", "createdAt");

COMMIT;


-- =====================================================================================================================
-- STEP 3 — VERIFY (read-only). Run after STEP 2 succeeded.
-- =====================================================================================================================

-- 3a. Expected: 8 rows — every table present, 0 rows in each (nothing was copied or invented).
SELECT 'user_avatars' AS t, count(*) FROM "user_avatars"
UNION ALL SELECT 'personal_courses', count(*) FROM "personal_courses"
UNION ALL SELECT 'personal_course_modules', count(*) FROM "personal_course_modules"
UNION ALL SELECT 'learner_materials', count(*) FROM "learner_materials"
UNION ALL SELECT 'learning_resources', count(*) FROM "learning_resources"
UNION ALL SELECT 'learner_assessments', count(*) FROM "learner_assessments"
UNION ALL SELECT 'assessment_attempts', count(*) FROM "assessment_attempts"
UNION ALL SELECT 'youtube_session_messages', count(*) FROM "youtube_session_messages";

-- 3b. Column counts. Expected: user_avatars 6, personal_courses 11, personal_course_modules 9, learner_materials 14,
--     learning_resources 16, learner_assessments 20, assessment_attempts 14, youtube_session_messages 7.
SELECT table_name, count(*) AS columns FROM information_schema.columns
WHERE table_schema = 'public' AND table_name IN ('user_avatars', 'personal_courses', 'personal_course_modules',
  'learner_materials', 'learning_resources', 'learner_assessments', 'assessment_attempts', 'youtube_session_messages')
GROUP BY table_name ORDER BY table_name;

-- 3c. learner_materials.storageKey must now be nullable (pasted text has no file). Expected: YES.
SELECT is_nullable FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'learner_materials' AND column_name = 'storageKey';

-- 3d. Indexes. Expected: 14 rows (the names listed in STEP 1c).
SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname IN (
  'IDX_personal_courses_userId', 'IDX_personal_course_modules_courseId', 'IDX_learner_materials_userId',
  'IDX_learner_materials_course', 'IDX_learning_resources_user', 'IDX_learning_resources_course',
  'UQ_learning_resources_request', 'IDX_learner_assessments_user', 'IDX_learner_assessments_course',
  'UQ_learner_assessments_request', 'IDX_assessment_attempts_user', 'IDX_assessment_attempts_assessment',
  'UQ_assessment_attempts_open', 'IDX_youtube_session_messages_session') ORDER BY 1, 2;

-- 3e. Foreign keys. Expected: 8 rows, all among the new tables (none to an existing table).
SELECT conrelid::regclass AS from_table, confrelid::regclass AS to_table, confdeltype AS on_delete -- n = SET NULL, c = CASCADE
FROM pg_constraint WHERE contype = 'f' AND conrelid::regclass::text IN
  ('learning_resources', 'learner_assessments', 'assessment_attempts') ORDER BY 1, 2;


-- =====================================================================================================================
-- STEP 4 — OPTIONAL: Row Level Security, to match the existing tables (read the note before running).
-- =====================================================================================================================
-- Supabase exposes tables in "public" through its Data API. The GleamLearn backend connects to Postgres directly and
-- does not use that API. If your existing tables (users, courses, …) have RLS ENABLED, enable it on the new tables
-- too so they are equally closed to the Data API. First check:
--
--   SELECT relname, relrowsecurity FROM pg_class
--   WHERE relname IN ('users', 'courses', 'files', 'library_saved_courses') AND relnamespace = 'public'::regnamespace;
--
-- Only if those show relrowsecurity = true AND the deployed backend works with them (proof that the backend's role
-- bypasses RLS), run:
--
--   ALTER TABLE "user_avatars"             ENABLE ROW LEVEL SECURITY;
--   ALTER TABLE "personal_courses"         ENABLE ROW LEVEL SECURITY;
--   ALTER TABLE "personal_course_modules"  ENABLE ROW LEVEL SECURITY;
--   ALTER TABLE "learner_materials"        ENABLE ROW LEVEL SECURITY;
--   ALTER TABLE "learning_resources"       ENABLE ROW LEVEL SECURITY;
--   ALTER TABLE "learner_assessments"      ENABLE ROW LEVEL SECURITY;
--   ALTER TABLE "assessment_attempts"      ENABLE ROW LEVEL SECURITY;
--   ALTER TABLE "youtube_session_messages" ENABLE ROW LEVEL SECURITY;
--
-- If the existing tables show false, leave the new ones the same way (consistent with what works today).


-- =====================================================================================================================
-- ROLLBACK (do not run unless needed; deploy a backend that does not use these tables FIRST). Deletes every avatar
-- choice, learner course, material record, generated lesson, quiz, attempt and YouTube Q&A. Uploaded files stay in
-- Cloudinary (gleamlearn-avatars/, gleamlearn-materials/) until removed separately.
-- =====================================================================================================================
-- BEGIN;
-- DROP TABLE IF EXISTS "youtube_session_messages";
-- DROP TABLE IF EXISTS "assessment_attempts";
-- DROP TABLE IF EXISTS "learner_assessments";
-- DROP TABLE IF EXISTS "learning_resources";
-- DROP TABLE IF EXISTS "learner_materials";
-- DROP TABLE IF EXISTS "personal_course_modules";
-- DROP TABLE IF EXISTS "personal_courses";
-- DROP TABLE IF EXISTS "user_avatars";
-- COMMIT;
