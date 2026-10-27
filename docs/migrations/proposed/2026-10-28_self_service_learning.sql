-- PROPOSED MIGRATION: NOT EXECUTED ON PRODUCTION. Requires explicit approval before running there.
-- Applied only to the disposable local database gleamlearn_e2e (test/live/apply-sql.mjs) for testing.
-- Run AFTER 2026-10-27_learner_content.sql (it alters two of the tables that migration creates).
--
-- Self-service learning: learners turn their own material (upload, pasted text, course outline, YouTube transcript)
-- into lessons, notes, quizzes and mock exams, take them, and keep their attempts.
--
--   learner_materials        + "sourceType", "extractedText", "textChars", "processingError", "updatedAt";
--                              "storageKey" becomes NULLable (pasted text has no stored file)
--   personal_courses         + "objectives", "archivedAt"
--   learning_resources       NEW  generated lessons / summaries / notes / study plans / key concepts / explanations
--   learner_assessments      NEW  learner-generated quizzes and mock exams (answer keys stay server-side)
--   assessment_attempts      NEW  attempts at those, with saved answers, score and review
--   youtube_session_messages NEW  questions and grounded answers in a YouTube learning session
--                                 (sessions themselves are the existing "youtube_resources" rows)
--
-- Ownership: every new row has "userId"; foreign keys tie rows to the learner's own course / material / assessment
-- (ON DELETE SET NULL for optional links, CASCADE for children). "requestId" + UNIQUE("userId","requestId") makes
-- generation idempotent (a double-click or retried request cannot create a second copy or a second AI charge).
-- At most ONE in-progress attempt per learner and assessment (partial unique index).
--
-- Guarantees: idempotent (IF NOT EXISTS), one transaction, no existing row is changed except that
-- learner_materials.storageKey stops being NOT NULL (no data change).

-- ---------- Read-only pre-check ----------
-- SELECT to_regclass('public.learner_materials'), to_regclass('public.personal_courses');   -- both NOT NULL expected
-- SELECT to_regclass('public.learning_resources'), to_regclass('public.learner_assessments'),
--        to_regclass('public.assessment_attempts'), to_regclass('public.youtube_session_messages');  -- all NULL expected

BEGIN;

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

-- ---------- Post-check (read-only) ----------
-- SELECT table_name FROM information_schema.tables WHERE table_name IN
--   ('learning_resources', 'learner_assessments', 'assessment_attempts', 'youtube_session_messages') ORDER BY 1;
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'learner_materials'
--   AND column_name IN ('sourceType', 'extractedText', 'textChars', 'processingError', 'updatedAt') ORDER BY 1;

-- ---------- Rollback (only if needed; deploy the previous backend version FIRST). Deletes generated content, ----------
-- ---------- assessments, attempts and YouTube Q&A history. ----------
-- BEGIN;
-- DROP TABLE IF EXISTS "youtube_session_messages";
-- DROP TABLE IF EXISTS "assessment_attempts";
-- DROP TABLE IF EXISTS "learner_assessments";
-- DROP TABLE IF EXISTS "learning_resources";
-- ALTER TABLE "personal_courses" DROP COLUMN IF EXISTS "archivedAt";
-- ALTER TABLE "personal_courses" DROP COLUMN IF EXISTS "objectives";
-- DROP INDEX IF EXISTS "IDX_learner_materials_course";
-- ALTER TABLE "learner_materials" DROP COLUMN IF EXISTS "updatedAt";
-- ALTER TABLE "learner_materials" DROP COLUMN IF EXISTS "processingError";
-- ALTER TABLE "learner_materials" DROP COLUMN IF EXISTS "textChars";
-- ALTER TABLE "learner_materials" DROP COLUMN IF EXISTS "extractedText";
-- ALTER TABLE "learner_materials" DROP COLUMN IF EXISTS "sourceType";
-- -- storageKey stays NULLable: rows of pasted text would otherwise block SET NOT NULL
-- COMMIT;
