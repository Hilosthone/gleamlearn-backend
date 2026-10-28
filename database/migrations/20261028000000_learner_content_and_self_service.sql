-- 20261028000000_learner_content_and_self_service.sql
--
-- Learner-owned content (avatars, personal courses and modules, uploaded materials) and self-service learning
-- (generated lessons, learner quizzes/exams, attempts, YouTube session Q&A): eight new tables.
--
-- Same statements, in the same order, as docs/migrations/proposed/2026-10-28_PRODUCTION_learner_content_and_self_service.sql,
-- which the owner ran MANUALLY on production (Supabase) and verified. Differences, for the runner only:
--   * no BEGIN/COMMIT (the runner runs this file in one transaction and records it in public.schema_migrations);
--   * no IF NOT EXISTS: on a database where any of these tables already exists, this migration FAILS (and rolls
--     back) instead of silently skipping it. Such a database is adopted with "baseline", which compares it with the
--     expected schema in 20261028000000_learner_content_and_self_service.schema.json (pinned below) — never by
--     re-running this file.
-- PRODUCTION: do NOT run this file there; baseline it (database/README.md, "The eight tables created manually").
-- Requires gen_random_uuid() (PostgreSQL 13+).
--
-- The expected-schema snapshot used by "baseline"; the runner refuses a snapshot file with any other SHA-256:
-- schema-snapshot-sha256: 5ae8de4825a1464f04156f48254650f886104f7b66e9d2fdbb3d9ac708ac5bcc


-- ---------- Part 1: 2026-10-27 learner content ----------

CREATE TABLE "user_avatars" (
  "userId"     uuid         PRIMARY KEY,
  "kind"       varchar(10)  NOT NULL,
  "presetId"   varchar(40)  NULL,
  "storageKey" varchar(500) NULL,
  "mimeType"   varchar(50)  NULL,
  "updatedAt"  timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT "CHK_user_avatars_kind" CHECK ("kind" IN ('preset', 'upload'))
);

CREATE TABLE "personal_courses" (
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
CREATE INDEX "IDX_personal_courses_userId" ON "personal_courses" ("userId");

CREATE TABLE "personal_course_modules" (
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
CREATE INDEX "IDX_personal_course_modules_courseId" ON "personal_course_modules" ("courseId");

CREATE TABLE "learner_materials" (
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
CREATE INDEX "IDX_learner_materials_userId" ON "learner_materials" ("userId");

-- ---------- Part 2: 2026-10-28 self-service learning ----------

ALTER TABLE "learner_materials" ADD COLUMN "sourceType" varchar(20) NOT NULL DEFAULT 'upload';
ALTER TABLE "learner_materials" ADD COLUMN "extractedText" text NULL;
ALTER TABLE "learner_materials" ADD COLUMN "textChars" integer NOT NULL DEFAULT 0;
ALTER TABLE "learner_materials" ADD COLUMN "processingError" text NULL;
ALTER TABLE "learner_materials" ADD COLUMN "updatedAt" timestamptz NOT NULL DEFAULT now();
ALTER TABLE "learner_materials" ALTER COLUMN "storageKey" DROP NOT NULL;
CREATE INDEX "IDX_learner_materials_course" ON "learner_materials" ("personalCourseId");

ALTER TABLE "personal_courses" ADD COLUMN "objectives" jsonb NOT NULL DEFAULT '[]';
ALTER TABLE "personal_courses" ADD COLUMN "archivedAt" timestamptz NULL;

CREATE TABLE "learning_resources" (
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
CREATE INDEX "IDX_learning_resources_user" ON "learning_resources" ("userId", "createdAt" DESC);
CREATE INDEX "IDX_learning_resources_course" ON "learning_resources" ("personalCourseId");
CREATE UNIQUE INDEX "UQ_learning_resources_request" ON "learning_resources" ("userId", "requestId") WHERE "requestId" IS NOT NULL;

CREATE TABLE "learner_assessments" (
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
CREATE INDEX "IDX_learner_assessments_user" ON "learner_assessments" ("userId", "kind", "createdAt" DESC);
CREATE INDEX "IDX_learner_assessments_course" ON "learner_assessments" ("personalCourseId");
CREATE UNIQUE INDEX "UQ_learner_assessments_request" ON "learner_assessments" ("userId", "requestId") WHERE "requestId" IS NOT NULL;

CREATE TABLE "assessment_attempts" (
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
CREATE INDEX "IDX_assessment_attempts_user" ON "assessment_attempts" ("userId", "startedAt" DESC);
CREATE INDEX "IDX_assessment_attempts_assessment" ON "assessment_attempts" ("assessmentId");
CREATE UNIQUE INDEX "UQ_assessment_attempts_open" ON "assessment_attempts" ("userId", "assessmentId") WHERE "status" = 'in_progress';

CREATE TABLE "youtube_session_messages" (
  "id"        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "sessionId" uuid        NOT NULL,
  "userId"    uuid        NOT NULL,
  "role"      varchar(10) NOT NULL CHECK ("role" IN ('user', 'assistant')),
  "content"   text        NOT NULL,
  "citations" jsonb       NOT NULL DEFAULT '[]',
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "IDX_youtube_session_messages_session" ON "youtube_session_messages" ("sessionId", "createdAt");
