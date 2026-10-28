# Database migrations

Schema changes for GleamLearn's PostgreSQL database (Supabase in production) are SQL files in `database/migrations/`. They are applied by a small runner, `scripts/db/migrate.mjs`, which records each one in `public.schema_migrations`.

> **Committing or deploying a migration file does not apply it anywhere.**
>
> - Nothing runs at API start-up, in `npm run build`, or on Render deploys.
> - A migration is applied only by someone running `npm run db:migration:run -- --confirm-target=<database>@<host>:<port>` on purpose.
> - For production that needs the approval steps in [Production](#production).

`DB_SYNCHRONIZE` must stay unset or `false` on every shared database, including Render.

- TypeORM's synchronize would rewrite the schema from the entities.
- It would drop what only the SQL migrations define: foreign keys, CHECK constraints and partial unique indexes.

## Commands (exact syntax)

| Command | What it does | Writes? |
|---|---|---|
| `npm run db:migration:status` | Lists each migration as `applied`, `baseline`, `pending` or `changed` (edited after being applied), plus `unknown` ones (in the database, not in this checkout). Exits 3 when anything needs action. | **No.** It runs in a `READ ONLY` transaction and never creates the history table. |
| `npm run db:migration:run -- --dry-run` | The plan: pending migrations in order, their statement counts and checksums | **No** |
| `npm run db:migration:run -- --confirm-target=<database>@<host>:<port>` | Applies the pending migrations | Yes |
| `npm run db:migration:baseline -- <version> --dry-run` | Compares the live schema with the migration's pinned expected snapshot and lists every difference | **No** (`READ ONLY`) |
| `npm run db:migration:baseline -- <version> --confirm-target=<database>@<host>:<port>` | Records an already-applied migration **without running it**, only if the comparison finds no difference | One history row |
| `npm run db:migration:create -- <name>` | New `database/migrations/<UTC timestamp>_<name>.sql` from a template | No (no connection) |
| `npm run db:migration:make-snapshot -- <version> <table> …` | Generates `<migration>.schema.json`, the expected schema for `baseline`, and prints the pin line. Uses a throw-away **local** database. | Only that scratch database, which it drops |

**Options, accepted exactly as written:**

| Option | Applies to | Purpose |
|---|---|---|
| `--dry-run` | `run`, `baseline` | A switch with no value |
| `--confirm-target=<database>@<host>:<port>` | `run`, `baseline` | **Required for every write, on any database including local ones** |
| `--target-env-file=<path>` | all except `create` | An env file that alone decides the database (see below) |
| `--strict-target` | all except `create` | Requires `MIGRATION_DATABASE_URL`; never uses the API's database settings |
| `--dir=<path>` | all | Migrations directory |
| `--lock-timeout-ms=<ms>` | `run`, `baseline` | How long to wait for a lock (default 5000) |
| `--statement-timeout-ms=<ms>` | `run` | How long a statement may run (default 300000) |

**Refused with exit 2, before any configuration is read or any database is contacted:**

- unknown options, including misspellings such as `--dryrun` and `--env-file` (Node 24 reserves that name);
- a value on a switch, such as `--dry-run=true`;
- an option without its value, or an option given twice;
- stray arguments;
- `--dry-run` together with `--confirm-target`;
- a write without `--confirm-target`.

**`--confirm-target`** must equal the **resolved** target, `database@host:port`, exactly as the refusal message prints it. It is compared before connecting. After connecting, the server's `current_database()` must also equal the resolved database, or the runner stops.

**Exit codes:**

| Code | Meaning |
|---|---|
| 0 | OK |
| 1 | A migration or baseline failed |
| 2 | Usage, configuration or connection problem |
| 3 | `status` or a dry run found something to act on |

The runner never prints passwords or connection strings.

## Which database it uses

The runner prints the resolved target first, for example `postgres on db.<ref>.supabase.co:5432 as postgres (from MIGRATION_DATABASE_URL, strict, REMOTE, TLS verified)`.

1. **`MIGRATION_DATABASE_URL`**, when present, is the target, for example `postgresql://user:password@host:5432/dbname`.
   - If it is present but blank or invalid, the runner **fails**; it never falls back.
   - Use it for any other host, or for a role allowed to change the schema while the API's role is not.
2. **Strict mode** (`--strict-target`, or `MIGRATION_STRICT_TARGET=true`) **requires** `MIGRATION_DATABASE_URL` and never uses `DATABASE_URL` or `DATABASE_HOST`. Use it for production.
3. **Otherwise the API's own rules** (`src/database/connection-config.ts`; a spec checks the runner agrees):
   - `DATABASE_URL` when it points at Supabase;
   - else `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD` and `DATABASE_NAME`.

**Where the variables come from:**

- **Default:** the project `.env`, with variables already set in the shell winning (like the API).
- **`--target-env-file=<path>`:** the file must exist, and **every database-target variable comes only from that file**. Inherited `DATABASE_*`, `MIGRATION_DATABASE_URL`, `MIGRATION_DATABASE_SSL_ROOT_CERT` and `MIGRATION_STRICT_TARGET` are ignored, so a stale exported production URL can't leak in.

**TLS for any non-local host:**

- Certificates are **verified**, including the host name (`rejectUnauthorized: true`).
- For Supabase, download the project's CA certificate (Dashboard → Project Settings → Database → SSL configuration) and set `MIGRATION_DATABASE_SSL_ROOT_CERT=<path to the .crt file>`. Don't commit the file; it's a path, not embedded content.
- URL TLS parameters that would weaken verification are refused: `sslmode` other than `verify-full`, `ssl=…`, `sslrootcert=…`, `sslcert`/`sslkey`, and so on.
- There is no fallback to plain text.
- The API's own connection settings are unchanged.

**Supabase connection type:** use the **direct** connection (`db.<ref>.supabase.co:5432`) or the session pooler. The transaction pooler (port 6543) works for normal migrations but is refused for `-- migrate:no-transaction` files.

## How it works

1. **Files.**
   - Names are `<14-digit UTC timestamp>_<lower_snake_name>.sql`, applied in version order.
   - Each file is split into statements by a SQL lexer (`scripts/db/sql-lexer.mjs`). It understands `--` and nested `/* */` comments, `'strings'`, `E'strings'`, `"identifiers"` and `$tag$` bodies.
   - **Transaction control is refused** anywhere, before anything runs: `BEGIN`, `START TRANSACTION`, `COMMIT`/`END` (including `AND CHAIN`, `WORK`, `TRANSACTION`), `ABORT`, `ROLLBACK`, `SAVEPOINT`, `RELEASE`, `PREPARE TRANSACTION`, `SET TRANSACTION`, `SET SESSION CHARACTERISTICS`.
   - Also refused: bad names, duplicate versions, empty files, unterminated strings or comments, and leftover `*.verify.sql` files.
2. **One transaction per migration.**
   - `BEGIN`, then lock and statement timeouts.
   - A transaction-level **advisory lock**.
   - `CREATE TABLE IF NOT EXISTS public.schema_migrations`, **inside this transaction**.
   - A re-check of the history for this version: the same checksum means skip; a **different** checksum is an error.
   - Each statement is sent separately through PostgreSQL's **extended protocol**, which accepts exactly one statement, so nothing the lexer missed could run as a second statement.
   - A check that the transaction id is unchanged, then the history row, then `COMMIT`.
   - **Any failure rolls back everything**: the schema changes, the history row, and a history table created in that transaction. The run stops, and the error gives the file line.
3. **Concurrent runners.** The advisory lock makes a second runner wait; afterwards it skips what the first applied (same checksum) or stops (different checksum).
4. **Checksums.** The SHA-256 of each file (line endings normalised) is stored. If an applied file was edited later, `status` shows `changed` and `run` refuses.
5. **`-- migrate:no-transaction`** files hold **exactly one** statement (for example `CREATE INDEX CONCURRENTLY`).
   - It runs under a session advisory lock, and the history row is written in a short transaction afterwards.
   - If it fails, nothing is recorded, but it may leave partial state, such as an `INVALID` index.

The columns of `public.schema_migrations` are `version`, `name`, `checksum`, `method` (`applied` or `baseline`), `snapshot_sha256` (for baselines), `applied_at`, `applied_by` and `execution_ms`.

## Writing a migration

1. `npm run db:migration:create -- add_course_tags`
2. Write the SQL.
   - Prefer **additive** changes. Dropping, renaming or rewriting data needs a backup, a written plan and explicit approval.
   - Name constraints and indexes explicitly.
   - Use plain `CREATE TABLE`, not `IF NOT EXISTS`, so an unexpected existing table fails the migration.
   - Keep the TypeORM entities in step.
3. Review it in the pull request, run `npm run db:migration:run -- --dry-run`, and watch for locks on big tables.
4. Test it locally:
   - `npm run db:migration:run -- --confirm-target=<value printed by the refusal message>`;
   - the API and its tests;
   - `npm run db:migration:status`.
5. If you changed the runner: `npx vitest run src/database` and `node test/live/migrator-live.mjs`.
6. Commit. **This does not apply it to production.**

## Production

Each step needs the owner's approval.

1. Review the merged migration file.
2. Back it up. See [Backup and recovery](#backup-and-recovery).
3. On a trusted machine, prepare an env file **outside the repository**, for example `C:\secure\gleamlearn-prod-migrate.env`:
   ```
   MIGRATION_DATABASE_URL=postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres
   MIGRATION_DATABASE_SSL_ROOT_CERT=C:\secure\supabase-prod-ca.crt
   MIGRATION_STRICT_TARGET=true
   ```
4. `npm run db:migration:status -- --target-env-file=C:\secure\gleamlearn-prod-migrate.env`. This is read-only. Check the printed target.
5. `npm run db:migration:run -- --dry-run --target-env-file=…`. Read-only; check the plan.
6. `npm run db:migration:run -- --confirm-target=postgres@db.<ref>.supabase.co:5432 --target-env-file=…`
7. `npm run db:migration:status -- --target-env-file=…` should show everything as applied.
8. Deploy the backend that uses the change, if it isn't deployed yet. Missing tables give 501 `FEATURE_UNAVAILABLE` until they exist.
9. Smoke-test, then delete or lock away the env file.

## The eight tables created manually (first production adoption)

`20261028000000_learner_content_and_self_service.sql` creates these tables:

- `user_avatars`
- `personal_courses`
- `personal_course_modules`
- `learner_materials`
- `learning_resources`
- `learner_assessments`
- `assessment_attempts`
- `youtube_session_messages`

Production already has them: the owner ran `docs/migrations/proposed/2026-10-28_PRODUCTION_learner_content_and_self_service.sql` in the Supabase SQL Editor. The migration file contains the same 30 statements in the same order, without `BEGIN`/`COMMIT` and `IF NOT EXISTS`. **Never run it on production**; it would fail and roll back anyway. Adopt it with `baseline`.

**What baseline checks against** is `20261028000000_learner_content_and_self_service.schema.json`:

- It was generated from a fresh database by `make-snapshot`.
- It is **pinned**: the migration file contains `-- schema-snapshot-sha256: <hex>`, and the runner refuses a snapshot with any other checksum.
- The snapshot is data. The runner compares it using only its own built-in catalogue `SELECT`s, in a `READ ONLY` transaction.

**Verified exactly** (no case-folding, no removing parentheses; only whitespace runs collapsed):

- **Tables:** all 8 exist in `public`; each is an ordinary, permanent (not UNLOGGED), non-partition table; there are no user triggers.
- **Columns (97):** exact type with modifiers (for example `character varying(200)`), NOT NULL, default expression, identity, generated, collation. No extra columns.
- **Indexes (22):** name, method, unique, primary, column counts, columns in order, `DESC`/`NULLS` options, expressions, partial predicate, validity. No extra indexes.
- **Constraints (20):**
  - 8 primary keys, 8 foreign keys and 4 CHECKs, including PostgreSQL-generated names such as `learner_assessments_kind_check`;
  - for each: kind, columns, referenced schema, table and columns, `ON DELETE`/`ON UPDATE`/`MATCH`, deferrable, validated, the exact CHECK expression, and the backing index;
  - no extra constraints.

**Not verified** (the dry run reports RLS flags and policies for information only):

- row level security and policies;
- grants, default privileges and ownership;
- index operator classes and per-column index collations;
- storage parameters, tablespaces, comments, statistics targets;
- row contents.

**PostgreSQL versions:**

- The snapshot was generated on PostgreSQL 18.6. Supabase runs an older major version, and the comparison **has not been run there**.
- If a version prints an expression differently, the dry run reports it as a difference. It **cannot** baseline wrongly.
- Review such a difference. If it is only formatting, add the production text as an `alternatives` entry for that field in the snapshot, then re-pin the checksum in the migration file. That is a reviewed change; never change the database to suit the snapshot.

**Steps (approval required; `<env>` is the production env file from [Production](#production)):**

1. `npm run db:migration:status -- --target-env-file=<env>`. It should show `pending 20261028000000_…` and that no history table exists yet.
2. `npm run db:migration:baseline -- 20261028000000 --dry-run --target-env-file=<env>`. This is **read-only** and must print `Schema matches`.
3. `npm run db:migration:baseline -- 20261028000000 --confirm-target=postgres@db.<ref>.supabase.co:5432 --target-env-file=<env>`.
   - This verifies again (read-only), then in one transaction: locks, takes ACCESS SHARE locks on the 8 tables, confirms nothing changed, creates `public.schema_migrations`, and inserts one `baseline` row with the snapshot checksum.
   - Any failure rolls all of it back, so no empty history table is left behind.
4. `npm run db:migration:status -- --target-env-file=<env>` should show `baseline` and exit 0.

A local database built with `DB_SYNCHRONIZE=true` (for example `gleamlearn_e2e`) will **not** match, because TypeORM creates no foreign keys, CHECKs or partial indexes. That is expected; use a fresh database and `run`.

## A migration failed

- **Normal migration:**
  - Nothing from it was applied or recorded. Read the error: SQLSTATE, the file line, and any detail or hint.
  - **If it was never applied anywhere shared,** fix the file and run again.
  - **If it was applied elsewhere,** don't edit it; add a new migration.
  - **A lock timeout** (`55P03`): retry at a quieter time, or raise `--lock-timeout-ms`.
- **"transaction control is not allowed":** remove the named statement. The runner owns the transaction.
- **"recorded with a different checksum":** another checkout applied a different version of this file. Stop and reconcile the files.
- **`-- migrate:no-transaction` migration:**
  - It was not recorded, but it may have left partial state.
  - Inspect it: `SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid;`
  - Clean up deliberately (`DROP INDEX CONCURRENTLY …`), then run again.
- **`status` shows `changed`:** restore the file from git and put the change in a new migration.
- **`status` shows `unknown`:** update your checkout first.
- **The connection fails:**
  - check the printed target and the variables above;
  - for a remote host, check `MIGRATION_DATABASE_SSL_ROOT_CERT` ("self-signed certificate" or "unable to verify" means the CA file is missing or wrong);
  - on Supabase, check the project isn't paused.

## Backup and recovery

- **Before any production migration,** confirm a fresh Supabase restore point (Dashboard → Database → Backups, or Point-in-Time Recovery). Alternatively, from a trusted machine, run `pg_dump "<url>" --format=custom --no-owner --file=gleamlearn-YYYYMMDD.dump`. Keep the dump outside the repository; it contains user data.
- **After a bad migration,** prefer a **forward fix**: a new, reviewed migration. Restore from backup only if data was damaged, and only with the owner's approval.
- **Never** reset, truncate or drop production tables to fix migration history.

## Files

| Path | Purpose |
|---|---|
| `database/migrations/*.sql` | Migrations (applied in version order) |
| `database/migrations/*.schema.json` | Pinned expected schemas used by `baseline` (data, never executed) |
| `scripts/db/migrate.mjs` | CLI behind the `npm run db:migration:*` scripts |
| `scripts/db/cli-args.mjs` | Strict argument parsing |
| `scripts/db/migrator.mjs` | Runner core: target and TLS, discovery, history, locking, transactions, baseline |
| `scripts/db/sql-lexer.mjs` | Statement splitting and transaction-control detection |
| `scripts/db/schema-snapshot.mjs` | Built-in catalogue queries and exact comparison |
| `scripts/db/make-snapshot.mjs` | Generates `*.schema.json` from a throw-away local database |
| `src/database/connection-config.ts` | The API's connection rules (TypeORM) |
| `src/database/*.spec.ts` | Unit tests (arguments, lexer, files, snapshots, target, TLS, `DB_SYNCHRONIZE`) |
| `test/live/migrator-live.mjs` | End-to-end tests on a local PostgreSQL, one scratch database per scenario |
| `docs/migrations/proposed/` | Earlier hand-run SQL proposals (history). Not run by the runner. |
