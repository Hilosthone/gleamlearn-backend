-- 20261028210252_official_assessment_attempts.sql
-- What this changes and why:
--   Learners' attempts at OFFICIAL (GleamLearn-published) quizzes, tests and exams were graded on submit but never
--   stored, so start / results / history / readiness answered 501. This adds one table for those attempts.
--   Purely additive: no existing table or row is changed.
--
--   * kind + assessmentId identify the official quiz/test/exam (rows in "quizzes", "tests", "exams"). There is no
--     foreign key because one column refers to three tables; the backend checks the assessment exists before
--     starting, and a deleted assessment simply leaves its learners' history readable.
--   * Ownership: every query filters on "userId" from the signed-in token.
--   * At most one in-progress attempt per learner and assessment (partial unique index), so two "Start" clicks
--     resume the same attempt.
--   * "review" holds the per-question review, written only when the attempt is submitted.
--
-- Rules (database/README.md):
--   * the runner runs this whole file in one transaction;
--   * never edit this file after it has been applied anywhere shared; write a new migration instead;
--   * committing this file does NOT apply it to production.

CREATE TABLE "official_assessment_attempts" (
  "id"             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"         uuid         NOT NULL,
  "kind"           varchar(10)  NOT NULL,
  "assessmentId"   uuid         NOT NULL,
  "title"          varchar(255) NOT NULL DEFAULT '',
  "status"         varchar(15)  NOT NULL DEFAULT 'in_progress',
  "answers"        jsonb        NOT NULL DEFAULT '{}',
  "score"          numeric(5,2) NULL,
  "correctCount"   integer      NULL,
  "gradableCount"  integer      NULL,
  "totalQuestions" integer      NOT NULL DEFAULT 0,
  "graded"         boolean      NOT NULL DEFAULT false,
  "review"         jsonb        NULL,
  "startedAt"      timestamptz  NOT NULL DEFAULT now(),
  "deadlineAt"     timestamptz  NULL,
  "submittedAt"    timestamptz  NULL,
  "updatedAt"      timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT "CHK_official_attempts_kind" CHECK ("kind" IN ('quiz', 'test', 'exam')),
  CONSTRAINT "CHK_official_attempts_status" CHECK ("status" IN ('in_progress', 'submitted'))
);

CREATE INDEX "IDX_official_attempts_user" ON "official_assessment_attempts" ("userId", "startedAt" DESC);
CREATE INDEX "IDX_official_attempts_assessment" ON "official_assessment_attempts" ("userId", "kind", "assessmentId");
CREATE UNIQUE INDEX "UQ_official_attempts_open" ON "official_assessment_attempts" ("userId", "kind", "assessmentId") WHERE "status" = 'in_progress';
