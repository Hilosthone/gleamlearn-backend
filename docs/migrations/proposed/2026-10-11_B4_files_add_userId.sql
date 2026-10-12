-- PROPOSED MIGRATION: NOT EXECUTED. Requires explicit approval before running.
-- Audit item: B4 (uploaded-file ownership). Review document: docs/migrations/MIGRATION_REVIEW.md
-- Revision 2 (2026-10-12): adds "sharedConfirmedAt" so legacy files are shared only when individually confirmed.
--
-- Affected table: "files"
-- New columns (both NULLable; no defaults; existing rows get NULL):
--   "userId"            uuid         owner (users.id). NULL = owner unknown (all rows existing before this migration).
--   "sharedConfirmedAt" timestamptz  set ONLY by an approved manual statement for a legacy file confirmed as
--                                    intentionally shared. NULL = not shared.
-- New indexes: "IDX_files_userId"
--
-- Guarantees:
--   * No existing row is updated, deleted or assigned an owner by this migration.
--   * No foreign key, so the migration cannot fail on existing data. A FK can follow after reconciliation.
--   * Idempotent (IF NOT EXISTS). Runs in one transaction: either all of it applies or none.
--
-- Deployment order: back up -> run this -> verify -> set LEGACY_FILES_ACCESS -> deploy the code that reads the columns.
-- Never deploy that code before this migration has run (with DB_SYNCHRONIZE off, every files query would fail).

-- ---------- Read-only pre-check (run first; share counts only) ----------
-- SELECT COUNT(*) AS total_files FROM "files";
-- SELECT status, COUNT(*) FROM "files" GROUP BY status ORDER BY status;
-- SELECT MIN("createdAt") AS oldest, MAX("createdAt") AS newest FROM "files";

BEGIN;

ALTER TABLE "files" ADD COLUMN IF NOT EXISTS "userId" uuid NULL;
ALTER TABLE "files" ADD COLUMN IF NOT EXISTS "sharedConfirmedAt" timestamptz NULL;
CREATE INDEX IF NOT EXISTS "IDX_files_userId" ON "files" ("userId");

COMMIT;

-- ---------- Post-check (read-only) ----------
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns
--   WHERE table_name = 'files' AND column_name IN ('userId', 'sharedConfirmedAt') ORDER BY column_name;
-- SELECT COUNT(*) AS rows_still_unowned FROM "files" WHERE "userId" IS NULL;   -- must equal total_files above

-- ---------- Rollback (only if needed; deploy the previous backend version FIRST) ----------
-- BEGIN;
-- DROP INDEX IF EXISTS "IDX_files_userId";
-- ALTER TABLE "files" DROP COLUMN IF EXISTS "sharedConfirmedAt";
-- ALTER TABLE "files" DROP COLUMN IF EXISTS "userId";
-- COMMIT;
-- Note: rolling back after the new code has run discards the owners recorded for files uploaded in the meantime.
