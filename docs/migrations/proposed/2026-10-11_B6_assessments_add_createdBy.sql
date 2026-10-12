-- PROPOSED MIGRATION: NOT EXECUTED. Requires explicit approval before running.
-- Audit item: B6 (quiz / test / exam authorization). Review document: docs/migrations/MIGRATION_REVIEW.md
-- Revision 2 (2026-10-12): adds "sharedConfirmedAt" so legacy assessments are shared only when individually confirmed.
--
-- Affected tables: "quizzes", "tests", "exams"
-- New columns on each (NULLable; no defaults; existing rows get NULL):
--   "createdBy"         uuid         creator (users.id). NULL = creator unknown (all rows existing before this migration).
--   "sharedConfirmedAt" timestamptz  set ONLY by an approved manual statement for a legacy row confirmed as
--                                    intentionally shared platform content. NULL = not shared.
-- New indexes: "IDX_quizzes_createdBy", "IDX_tests_createdBy", "IDX_exams_createdBy"
--
-- Guarantees: no existing row is updated, deleted or assigned a creator. No FK. Idempotent. One transaction.
-- Deployment order: back up -> run this -> verify -> set LEGACY_ASSESSMENTS_ACCESS -> deploy the code that reads the columns.

-- ---------- Read-only pre-check (run first; share counts only) ----------
-- SELECT 'quizzes' AS t, COUNT(*) FROM "quizzes"
-- UNION ALL SELECT 'tests', COUNT(*) FROM "tests"
-- UNION ALL SELECT 'exams', COUNT(*) FROM "exams";
-- SELECT 'quizzes' AS t, MIN("createdAt"), MAX("createdAt") FROM "quizzes"
-- UNION ALL SELECT 'tests', MIN("createdAt"), MAX("createdAt") FROM "tests"
-- UNION ALL SELECT 'exams', MIN("createdAt"), MAX("createdAt") FROM "exams";

BEGIN;

ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "createdBy" uuid NULL;
ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "sharedConfirmedAt" timestamptz NULL;
ALTER TABLE "tests"   ADD COLUMN IF NOT EXISTS "createdBy" uuid NULL;
ALTER TABLE "tests"   ADD COLUMN IF NOT EXISTS "sharedConfirmedAt" timestamptz NULL;
ALTER TABLE "exams"   ADD COLUMN IF NOT EXISTS "createdBy" uuid NULL;
ALTER TABLE "exams"   ADD COLUMN IF NOT EXISTS "sharedConfirmedAt" timestamptz NULL;

CREATE INDEX IF NOT EXISTS "IDX_quizzes_createdBy" ON "quizzes" ("createdBy");
CREATE INDEX IF NOT EXISTS "IDX_tests_createdBy"   ON "tests"   ("createdBy");
CREATE INDEX IF NOT EXISTS "IDX_exams_createdBy"   ON "exams"   ("createdBy");

COMMIT;

-- ---------- Post-check (read-only) ----------
-- SELECT table_name, column_name, data_type, is_nullable FROM information_schema.columns
--   WHERE table_name IN ('quizzes', 'tests', 'exams') AND column_name IN ('createdBy', 'sharedConfirmedAt')
--   ORDER BY table_name, column_name;   -- expect 6 rows, all is_nullable = YES

-- ---------- Rollback (only if needed; deploy the previous backend version FIRST) ----------
-- BEGIN;
-- DROP INDEX IF EXISTS "IDX_quizzes_createdBy";
-- DROP INDEX IF EXISTS "IDX_tests_createdBy";
-- DROP INDEX IF EXISTS "IDX_exams_createdBy";
-- ALTER TABLE "quizzes" DROP COLUMN IF EXISTS "sharedConfirmedAt";
-- ALTER TABLE "quizzes" DROP COLUMN IF EXISTS "createdBy";
-- ALTER TABLE "tests"   DROP COLUMN IF EXISTS "sharedConfirmedAt";
-- ALTER TABLE "tests"   DROP COLUMN IF EXISTS "createdBy";
-- ALTER TABLE "exams"   DROP COLUMN IF EXISTS "sharedConfirmedAt";
-- ALTER TABLE "exams"   DROP COLUMN IF EXISTS "createdBy";
-- COMMIT;
