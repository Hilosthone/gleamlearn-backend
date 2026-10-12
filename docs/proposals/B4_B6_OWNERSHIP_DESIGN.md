# Ownership & Authorization Design: Uploaded Files (B4) and Quizzes/Tests/Exams (B6)

> **Revision 2 (2026-10-12): flag semantics superseded.** Per the owner's decision, unknown-ownership rows are shared **only** when individually confirmed (a new nullable `sharedConfirmedAt` column, set only by an approved per-record statement).
> - Allowed flag values are `hidden` (the default, also used for any unset or invalid value) and `confirmed-shared-readonly`.
> - The `shared-readonly` mode described below, which would have shared **all** legacy rows, is withdrawn.
>
> The authoritative migration SQL, flag rules, deployment order and backup plan are in `docs/migrations/MIGRATION_REVIEW.md`.


**Status:** ⬜ Proposal for review. Nothing here is implemented, migrated or deployed.
**Prepared:** 2026-10-11.
**Migrations (drafts, not executed):**
- `docs/migrations/proposed/2026-10-11_B4_files_add_userId.sql`
- `docs/migrations/proposed/2026-10-11_B6_assessments_add_createdBy.sql`

---

## 0. Evidence gathered

| Source | Finding |
|---|---|
| Schema (`files` entity) | No uploader column. Nothing else references files by user (`ai_generated_contents.fileId` is never written; library favorites use a generic `referenceId`; activity and audit logs don't record uploads). **Owners of existing files cannot be inferred.** |
| Schema (`quizzes`, `tests`, `exams`) | No creator column. All three have identical shapes (`title`, `description`, `courseId`, `questions`, `durationMinutes`). |
| Roles | `users.role` exists (default `'student'`), but no backend code checks it, and `JwtStrategy` loads the auth entity, which has no `role` (B2). **No teacher role exists.** Admins are a separate `admins` table with `admin-jwt` tokens and no quiz/test/exam endpoints. |
| Frontend (`gleamlearn-landing/src/lib/api.ts`) | A student-facing client declares `POST/PATCH/DELETE /quizzes`, `/tests` and `/exams` ("Create a new quiz manually"), the `generate*` routes, attempts and history, plus `/files` upload, list and get. **No page imports this client yet**, so no live workflow depends on current behaviour. |
| Local database (read-only `SELECT COUNT(*)` in a `READ ONLY` transaction) | `files` 0, `quizzes` 0, `tests` 0, `exams` 0, `youtube_resources` 2, `admins` 1. No owner columns exist. **This is local development data only.** Production counts are unknown; the owner must run the pre-check queries in each SQL file. |
| Cloudinary | Uploaded files are stored with public `secure_url`s. Anyone who has a URL can download the file, regardless of API checks. API authorization limits *discovery* (listing and IDs), not raw URL access. |

### Additional defects found (pre-existing; fixes proposed below)

1. **Route-order bug:**
   - `quizzes.controller.ts` and `tests.controller.ts` declare `@Get(':id')` before `@Get('attempts')`. `exams.controller.ts` declares `@Get(':id')` before `@Get('history')`.
   - So `GET /quizzes/attempts`, `GET /tests/attempts` and `GET /exams/history` are treated as lookups with ID `"attempts"` or `"history"`, which fail (404, or 500 from a uuid cast).
2. **File-ownership bypass:**
   - `POST /quizzes|tests|exams/generate-from-document` forward a **client-supplied `fileUrl`** to the AI service.
   - A user can generate from another user's file (if they know its URL), or make the AI service fetch any URL (SSRF and cost).

---

## 1. Uploaded files (B4, Option A)

### 1.1 Migration

`2026-10-11_B4_files_add_userId.sql`, reviewed:

- **Additive:** `ADD COLUMN IF NOT EXISTS "userId" uuid NULL` plus `CREATE INDEX IF NOT EXISTS "IDX_files_userId"`. Wrapped in a transaction, idempotent, with a rollback script included.
- **No data changes:** existing rows get `NULL` (legacy, owner unknown). No foreign key yet, so it cannot fail on existing data.
- **Type:** `uuid`, which matches `users.id` (`PrimaryGeneratedColumn('uuid')`). The entity will declare `@Column({ type: 'uuid', nullable: true })` so an accidental `DB_SYNCHRONIZE=true` run would not alter the column type.
- **Order:** the migration **must** run before the code that declares the column. Otherwise every `files` query fails with "column does not exist".

### 1.2 Access rules

| Action | Owner (`userId` = me) | Another user's file | Legacy file (`userId` NULL), `LEGACY_FILES_ACCESS=shared-readonly` | Legacy file, `LEGACY_FILES_ACCESS=hidden` (default) |
|---|---|---|---|---|
| `POST /files/upload`, `/upload/multiple` | Creates the row with `userId` = me | — | — | — |
| `GET /files` (list) | Listed | **Not listed** | Listed, marked `legacy: true` | Not listed |
| `GET /files/:id`, `/:id/status` | ✅ | 404 | ✅ | 404 |
| AI generation from the file (`/ai/documents/:id/*`, `generate-from-document`) | ✅ | 404 | ✅ (it reads content the user can already read) | 404 |
| `DELETE /files/:id`, `POST /files/:id/process`, `/:id/reprocess` | ✅ | 404 | **403 "legacy file is read-only"** | 404 |

- **Another user's files are never visible.** The rule is `userId = me`, plus legacy rows only when explicitly enabled.
- All "not yours" answers are 404 (the same as nonexistent), so IDs can't be probed.

### 1.3 `LEGACY_FILES_ACCESS`: explicit meaning, fail-closed

| Value | Meaning |
|---|---|
| `hidden` | **Default.** Also used when the variable is unset, empty or misspelled. Legacy files are invisible to all regular users. Records are kept intact; nothing is deleted. |
| `shared-readonly` | Option A, transitional. Legacy files are listable and readable by authenticated users, as they are today, but never modifiable or deletable by users. |

- The flag affects **only** rows with `userId IS NULL`. Files with an owner are always owner-only, whatever the flag says.
- No value of the flag grants write access to anything.
- The backend logs the effective mode once at startup (the mode name only).
- **Selecting Option A therefore requires setting `LEGACY_FILES_ACCESS=shared-readonly` explicitly on Render.** A missing variable can never widen access.

Why fail-closed even though Option A was chosen: if the variable is lost in a misconfiguration, the safe failure is "legacy files temporarily hidden, records intact". Exposing them by accident would be the unsafe failure. Hidden files reappear as soon as the variable is set again; nothing is lost.

### 1.4 Reconciling legacy files with their real owners (later)

1. **Inventory (read-only):** `SELECT id, "originalName", "mimeType", size, "createdAt" FROM files WHERE "userId" IS NULL ORDER BY "createdAt";`
2. **Evidence-based assignment only:** users can't "claim" a file themselves, because there is no proof of ownership. Assignment is done by an admin or the owner, based on evidence such as support requests, upload timing, or knowledge of the beta testers.
3. **Approved one-off SQL per file** (only after approval; it touches records):

   ```sql
   UPDATE files SET "userId" = $owner WHERE id = $file AND "userId" IS NULL;
   ```

   The `AND "userId" IS NULL` guard prevents overwriting an owner. Record each assignment in the admin audit log.
4. **Sunset:** after an announced date, switch `LEGACY_FILES_ACCESS` to `hidden`. Unassigned legacy files stay stored and can still be assigned later. They are never deleted as part of this process.
5. **Optional later step:** once no legacy rows remain, add a foreign key `files.userId → users.id`. That is a separate approved migration.

### 1.5 Code changes (once approved)

| File | Change |
|---|---|
| `src/files/entities/file.entity.ts` | `userId: string \| null` column (`uuid`, nullable) |
| `src/files/files.controller.ts` | Pass `@CurrentUser('id')` to every route. Paths and payloads are unchanged. |
| `src/files/files.service.ts` | Owner-scoped `findAccessibleFile(id, userId, intent: 'read' \| 'write')`; listing filter; `saveFileRecord` sets `userId`; legacy mode resolved from config |
| `src/ai/ai.service.ts` | `callDocumentPipeline` uses `findAccessibleFile(id, userId, 'read')`. The controller passes the user ID (it already imports `CurrentUser`). |
| `src/quizzes|tests|exams/*.service.ts` `generateFromDocument` | If `fileId` or `documentId` is given, resolve the URL through `findAccessibleFile` and **ignore any client `fileUrl`**. If only a `fileUrl` is given, reject with 400 "fileId is required". This is a contract tightening; see 1.6. |
| Specs | Owner, non-owner, legacy (both modes) and unset-flag cases |

### 1.6 Compatibility

- Paths, payloads and response shapes are unchanged. Added: `userId` on file records (and `legacy: true` on legacy rows in `shared-readonly` mode).
- **Contract tightening:** `generate-from-document` without a `fileId` (URL only) would return 400. The frontend client sends a generic payload there. Its field names should be confirmed when the frontend is wired.

### 1.7 Deployment sequence (each step needs your go-ahead)

1. Back up the database (`pg_dump` or the provider's snapshot).
2. Run the pre-check count query. Choose the `LEGACY_FILES_ACCESS` value.
3. Execute the B4 migration. Verify: `SELECT column_name FROM information_schema.columns WHERE table_name='files' AND column_name='userId';`
4. Set `LEGACY_FILES_ACCESS` on Render (`shared-readonly` for Option A).
5. Deploy the backend.
6. **Rollback:** redeploy the previous backend version first. The column can stay; it is harmless to old code. Drop it only if needed, using the rollback script.

---

## 2. Quizzes, tests and exams (B6)

### 2.1 Migration

`2026-10-11_B6_assessments_add_createdBy.sql`, reviewed: additive nullable `createdBy uuid` plus an index on each of `quizzes`, `tests` and `exams`. No data changes; rollback included. Same ordering rule (migration before code) and the same backup and verification steps as 1.7.

### 2.2 Authorization matrix

| Operation | Creator | Other student | Legacy row (`createdBy` NULL) | Admin |
|---|---|---|---|---|
| `GET /x` (list) | Own rows | — | Listed only if `LEGACY_ASSESSMENTS_ACCESS=shared-readonly` | See 2.4 |
| `GET /x/:id` | ✅ | **404** | ✅ if shared, else 404 | See 2.4 |
| `POST /x` (create) | ✅, sets `createdBy` = me | — | — | — |
| `PATCH`/`DELETE /x/:id` | ✅ | **404** | **403 read-only** | See 2.4 |
| `POST /x/:id/start`, `/submit`, `GET /x/:id/results\|result`, exams `/simulate`, `/readiness` | ✅ | **404** | ✅ if shared | — |
| `POST /x/generate*` | ✅ (returns content and stores nothing, as today) | ✅ | n/a | — |
| Teacher | No teacher role exists. Out of scope until one is designed. | | | |

- **No global listing of user content:** private user-created quizzes are never shown to other users. A row's `createdBy` = me, or it is legacy and the flag is enabled.
- **`LEGACY_ASSESSMENTS_ACCESS`:** `hidden` (default, fail-closed) or `shared-readonly`. Same semantics as `LEGACY_FILES_ACCESS`.
- **Platform content, honest limitation:** legacy rows can't be told apart as "platform" versus "private user-created" (both have NULL `createdBy`). That is why sharing them requires an explicit opt-in.
- A true platform catalogue needs one of two things: an explicit `visibility` column, or admin-created rows with a dedicated marker. That would be a later, separate design and migration.

### 2.3 Attempts and rewards

- Quiz rewards (Batch 1) remain once per user per quiz, and only for quizzes the user is authorized to access.
- `GET /quizzes/attempts`, `/tests/attempts` and `/exams/history` are placeholders today, and unreachable because of the route-order bug. **Fix:** move the static routes above `:id` in the three controllers. No contract change: the paths become reachable as documented.

### 2.4 Admin management

- There are no admin endpoints for quizzes, tests or exams today. **Proposal:** none in this batch. Admins don't use user tokens, so user-route checks never apply to admins.
- If admin moderation is needed, add `api/v1/admin/quizzes|tests|exams` routes guarded by the existing `AdminJwtGuard` (and its role or permission checks). That is a separate approval.
- Until then, the platform owner can manage rows directly in the database with approved SQL.

### 2.5 Code changes (once approved)

| File | Change |
|---|---|
| `src/quizzes/entities/quiz.entity.ts`, `src/tests/entities/test.entity.ts`, `src/exams/entities/exam.entity.ts` | `createdBy: string \| null` (`uuid`, nullable) |
| `src/{quizzes,tests,exams}/*.controller.ts` | Pass `@CurrentUser('id')`; move static routes above `:id` |
| `src/{quizzes,tests,exams}/*.service.ts` | Owner-scoped `findAccessible(id, userId, 'read' \| 'write')`, a scoped `findAll`, `create` sets `createdBy`, and checks on update, delete, start, submit and results |
| `src/common/authorization/legacy-access.ts` (new) | Shared resolver for the two `LEGACY_*_ACCESS` flags (fail-closed) |
| Specs | The matrix above, per resource |

### 2.6 Compatibility

- Paths, payloads and response shapes are unchanged.
- Visible differences:
  - Other users' rows disappear from lists, and their IDs return 404.
  - Legacy rows are read-only, and hidden unless the flag is set.
- The frontend isn't wired yet, so there is no live breakage.

---

## 3. Decisions needed

1. Approve the B4 migration and the deployment sequence in 1.7.
2. Confirm the fail-closed default (`hidden` when unset), with Option A enabled explicitly through `LEGACY_FILES_ACCESS=shared-readonly`.
3. Approve the B6 migration, the matrix in 2.2, and `LEGACY_ASSESSMENTS_ACCESS` with the same semantics.
4. Approve the route-order fix (2.3) and the `generate-from-document` tightening (1.5 and 1.6).
5. Run the pre-check count queries on production and share the counts (counts only).
