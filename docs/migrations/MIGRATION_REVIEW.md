# Migration Review Package: B4 (file ownership) and B6 (assessment creators)

**Status:** ⬜ Awaiting the owner's review and production counts. **Neither migration has been executed anywhere** (not on production, and not on the local database). No code that depends on these columns has been written or deployed.
**Revision:** 2 (2026-10-12). This supersedes the `shared-readonly` flag semantics in `docs/proposals/B4_B6_OWNERSHIP_DESIGN.md`.

---

## 1. Exact SQL

| Migration | File | Forward | Rollback |
|---|---|---|---|
| B4 | `docs/migrations/proposed/2026-10-11_B4_files_add_userId.sql` | 2× `ADD COLUMN IF NOT EXISTS`, 1× `CREATE INDEX IF NOT EXISTS`, in `BEGIN … COMMIT` | Commented block at the end of the file |
| B6 | `docs/migrations/proposed/2026-10-11_B6_assessments_add_createdBy.sql` | 6× `ADD COLUMN IF NOT EXISTS`, 3× `CREATE INDEX IF NOT EXISTS`, in `BEGIN … COMMIT` | Commented block at the end of the file |

Forward SQL, for convenience. The files are authoritative.

```sql
-- B4
BEGIN;
ALTER TABLE "files" ADD COLUMN IF NOT EXISTS "userId" uuid NULL;
ALTER TABLE "files" ADD COLUMN IF NOT EXISTS "sharedConfirmedAt" timestamptz NULL;
CREATE INDEX IF NOT EXISTS "IDX_files_userId" ON "files" ("userId");
COMMIT;

-- B6
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
```

Rollback SQL:

```sql
-- B4 rollback
BEGIN;
DROP INDEX IF EXISTS "IDX_files_userId";
ALTER TABLE "files" DROP COLUMN IF EXISTS "sharedConfirmedAt";
ALTER TABLE "files" DROP COLUMN IF EXISTS "userId";
COMMIT;

-- B6 rollback
BEGIN;
DROP INDEX IF EXISTS "IDX_quizzes_createdBy";
DROP INDEX IF EXISTS "IDX_tests_createdBy";
DROP INDEX IF EXISTS "IDX_exams_createdBy";
ALTER TABLE "quizzes" DROP COLUMN IF EXISTS "sharedConfirmedAt";
ALTER TABLE "quizzes" DROP COLUMN IF EXISTS "createdBy";
ALTER TABLE "tests"   DROP COLUMN IF EXISTS "sharedConfirmedAt";
ALTER TABLE "tests"   DROP COLUMN IF EXISTS "createdBy";
ALTER TABLE "exams"   DROP COLUMN IF EXISTS "sharedConfirmedAt";
ALTER TABLE "exams"   DROP COLUMN IF EXISTS "createdBy";
COMMIT;
```

**Locking and runtime notes (PostgreSQL ≥ 11):**
- `ADD COLUMN … NULL` without a default is a catalog-only change: instant, no table rewrite. It takes a brief `ACCESS EXCLUSIVE` lock.
- A plain `CREATE INDEX` blocks writes to that table while it builds. That is negligible at current sizes. If a table turns out to be large, replace it with `CREATE INDEX CONCURRENTLY` run **outside** the transaction block.

**Verification performed:** manual review only. The statements use standard PostgreSQL DDL; column names follow the entities' existing camelCase quoting (for example `"createdAt"`); `uuid` matches `users.id` (`PrimaryGeneratedColumn('uuid')`); the table names come from the entities (`files`, `quizzes`, `tests`, `exams`). **The SQL has not been executed.** A dry run on a restored copy (see section 6) is part of the plan.

## 2. Read-only production count queries

Run these in a read-only session and share **counts only**. Results: ⬜ pending (owner).

```sql
BEGIN READ ONLY;
SELECT 'files' AS t, COUNT(*) FROM "files"
UNION ALL SELECT 'quizzes', COUNT(*) FROM "quizzes"
UNION ALL SELECT 'tests',   COUNT(*) FROM "tests"
UNION ALL SELECT 'exams',   COUNT(*) FROM "exams";
SELECT status, COUNT(*) FROM "files" GROUP BY status ORDER BY status;
SELECT table_name, column_name FROM information_schema.columns
  WHERE table_name IN ('files','quizzes','tests','exams')
    AND column_name IN ('userId','createdBy','sharedConfirmedAt');   -- expect 0 rows today
SELECT version();                                                     -- confirm PostgreSQL >= 11
ROLLBACK;
```

| Query | Production result |
|---|---|
| `files` count | ⬜ |
| `quizzes` / `tests` / `exams` counts | ⬜ |
| Existing owner columns | ⬜ (expected: none) |
| PostgreSQL version | ⬜ |

For reference only: the local development database (read in a `READ ONLY` transaction, 2026-10-11) has `files` 0, `quizzes` 0, `tests` 0, `exams` 0, and no owner columns. This says nothing about production.

## 3. Tables and columns affected

| Table | New column | Type | Null | Default | Index | Meaning |
|---|---|---|---|---|---|---|
| `files` | `userId` | `uuid` | YES | none | `IDX_files_userId` | Uploader. NULL = unknown (all pre-existing rows) |
| `files` | `sharedConfirmedAt` | `timestamptz` | YES | none | none | Set only when a legacy file is confirmed intentionally shared |
| `quizzes`, `tests`, `exams` | `createdBy` | `uuid` | YES | none | `IDX_<table>_createdBy` | Creator. NULL = unknown (all pre-existing rows) |
| `quizzes`, `tests`, `exams` | `sharedConfirmedAt` | `timestamptz` | YES | none | none | Set only when a legacy row is confirmed intentionally shared |

No existing column is altered or dropped. No other table is touched.

## 4. Existing records and unknown ownership

- **Nothing is updated, deleted or assigned by the migrations.** Every existing row ends with `userId`/`createdBy` = NULL and `sharedConfirmedAt` = NULL.
- **Ownership is never guessed.** There is no automatic backfill: no data establishes who uploaded files or created assessments (investigation in the design document, section 0).
- **Unknown-owner rows are hidden by default.** Their records stay intact and can be revealed later, through explicit, per-record confirmation of sharing or through an evidence-based owner assignment.

### 4.1 `LEGACY_FILES_ACCESS` and `LEGACY_ASSESSMENTS_ACCESS`

| Value | Behaviour for rows whose owner is unknown | Behaviour for owned rows |
|---|---|---|
| `hidden` | **Default.** Also applies when the variable is unset, empty, misspelled or any other value. Not listed. Direct access → 404, the same as nonexistent. | Owner-only, always |
| `confirmed-shared-readonly` | Listed and readable by authenticated users **only if `sharedConfirmedAt IS NOT NULL`**. Rows without confirmation stay hidden. Edit, delete, process and reprocess → 403 "read-only". | Owner-only, always |

Rules that hold in **every** mode:
1. Rows with an owner are visible only to their owner. No flag value changes this.
2. No flag value permits editing or deleting any row the requester does not own.
3. A legacy row becomes shared only when an operator deliberately sets `sharedConfirmedAt` for that specific row, through an approved statement. The flag alone shares nothing.
4. Records are never deleted by the application because of these flags.
5. The effective mode name (never any data) is logged once at startup.

The values are parsed case-sensitively after trimming, so `confirmed-shared-readonly` must be spelled exactly. Anything else means `hidden`.

### 4.2 Confirming a legacy row as intentionally shared (later, per record, with approval)

```sql
-- Only after confirming the content is meant to be shared (e.g. platform material):
UPDATE "quizzes" SET "sharedConfirmedAt" = now()
 WHERE id = '<quiz-id>' AND "createdBy" IS NULL AND "sharedConfirmedAt" IS NULL;
```

### 4.3 Assigning a real owner (later, per record, with approval and evidence)

```sql
UPDATE "files" SET "userId" = '<user-id>'
 WHERE id = '<file-id>' AND "userId" IS NULL;   -- never overwrites an existing owner
```

Record each assignment (who, when, what evidence) in the admin audit log. Unassigned legacy rows stay stored indefinitely; hiding them is the only automatic effect.

## 5. Deployment order and compatibility

| Step | Action | Owner approval needed |
|---|---|---|
| 1 | Back up the production database (section 6) | ✅ |
| 2 | Run the section 2 counts; share the results | — |
| 3 | Dry-run both migrations on a restored copy, then verify the post-checks | ✅ |
| 4 | Execute the B4 and/or B6 migration on production | ✅ |
| 5 | Run the post-check queries in each SQL file | — |
| 6 | Set `LEGACY_FILES_ACCESS` / `LEGACY_ASSESSMENTS_ACCESS` on Render (or leave unset = `hidden`) | ✅ |
| 7 | Deploy the backend version that reads the new columns | ✅ |

**Compatibility:**
- **Old code with new columns:** safe. Old code ignores unknown nullable columns. This is why the migration goes first.
- **New code without the columns:** **breaks.** Every query on those tables fails with "column does not exist". Never deploy it before step 5 succeeds.
- **API:** paths, payloads and response shapes are unchanged. File records gain `userId`; assessments gain `createdBy`.
- **Visible behaviour:**
  - Other users' rows disappear from lists and return 404.
  - Legacy rows are hidden unless individually confirmed and the flag is enabled.
  - Legacy rows are read-only for everyone.
- **Frontend:** the client in `gleamlearn-landing/src/lib/api.ts` is not wired into pages yet, so there is no live breakage. This has to be re-verified once the frontend repository is accessible.

## 6. Backup and recovery plan

1. **Before step 4:** take a full backup.
   - Either the provider's snapshot (Render PostgreSQL "Backups", or Supabase "Database → Backups"), or `pg_dump --format=custom --no-owner --file=gleamlearn_pre_B4B6_<date>.dump "$DATABASE_URL"` from a trusted machine.
   - Keep the dump private; it contains user data.
2. **Verify the backup:** restore it to a **separate** database and run the section 2 counts against it. They must match production.
3. **Dry run:** apply both forward scripts on the restored copy, run the post-checks, then the rollback scripts, and confirm the post-checks return 0 rows again.
4. **Recovery options, in order of preference:**
   1. Problem in the **new code**: redeploy the previous backend version. The columns can stay; they are harmless.
   2. Problem with the **columns themselves**: redeploy the previous backend version, **then** run the rollback SQL.
   3. **Data damage** (not expected; the migrations write no data): restore from the step 1 backup. Writes made after the backup would need to be re-applied.
5. Keep the backup for at least 30 days after deployment.

## 7. Decisions requested

1. Production counts and the PostgreSQL version (section 2).
2. Approval to run the dry run on a restored copy (step 3).
3. Approval to execute each migration (step 4), separately for B4 and B6.
4. The flag values to use after deployment. The recommended start is `hidden` for both.
5. Approval to implement the migration-dependent code (owner-scoped files and creator-based assessments, with tests for owners, other users, legacy rows and admins). It will be written against these exact columns and not deployed until step 5 is done.
