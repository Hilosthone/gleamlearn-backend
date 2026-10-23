# Production recovery plan: `public.users`

**Status:** proposal, **not executed**, waiting for approval (2026-10-23).
**SQL:** `docs/migrations/proposed/2026-10-23_restore_public_users.sql`. It supersedes `2026-10-20_users_table_recovery.sql`.
**Code inspected:** `main` = `origin/main` = `f4ba70a`. Confirm in Render (service → Events) that this is the deployed commit.

## 1. What is known

**From the owner** (Supabase SQL Editor, 2026-10-23):
- The server is PostgreSQL 17.6, and the schema is `public`.
- `public.users` is **missing**, and so is `public.calendar_events`.
- `public.admins` exists, and so does `auth.users` (Supabase Auth).
- The other application tables exist, including progress, achievements, badges and streaks.
- There's no migration tracking table.
- **No foreign keys reference `users`.**
- No learners have registered yet.

**From code and local databases** (verified today):
- The backend has no migrations, and `synchronize` has been off since `5a0c4cc`. Nothing in `src` drops or renames tables.
- A table that is missing, with no foreign keys pointing at it, matches the "dropped (CASCADE) or never created in this project" case.
- Recreating it **empty** loses nothing, because no learners exist.

## 2. Which schema is authoritative

No single definition is authoritative. The deployed code reads and writes `public.users` through **four** paths, and the table has to satisfy all of them:

| Path | Code | Columns it needs |
|---|---|---|
| TypeORM auth `User` | `src/auth/entities/user.entity.ts`. Used by sign-up, login, verify, resend, forgot/reset, `/auth/me`, the users service, admin users/dashboard/export/security, leaderboards and xp. | 26 columns, including `verification_otp`, `otp_expires_at`, `refresh_token`, `is_restricted`, `restriction_reason`, `created_at` and `updated_at` |
| TypeORM users-module `User` | `src/users/users.entity.ts`. Registered by `src/admin/gamification/gamification.module.ts` (in `AdminModule`), so it is loaded at runtime. Its `findOne` selects all its columns and adds `"deletedAt" IS NULL`. | Also `institution`, `levelOrClass`, `preferredLearningPace`, `academicGoals`, `isFrozen`, `role`, `createdAt`, `updatedAt` and `deletedAt` |
| Raw SQL | `src/auth/account-status.service.ts`, which runs on **every** sign-in and authenticated request | `is_restricted`, `restriction_reason`, `isFrozen`, `deletedAt` and `role`. It detects which exist at startup and enforces only those. |
| Prisma `User` | `prisma/schema.prisma` (`@@map("users")`). Used only by search, which selects `id`, `fullName`, `username` and `email`. | Those 4 columns |

**The required table is therefore the union of the two TypeORM entities** (35 columns). This is exactly what TypeORM itself builds from this code.
- It was extracted from the catalog of **two local databases built by the app** (`gleamlearn_e2e`, and the developer database `mycoursea_db`), which are identical.
- The proposal's verification query (V1) was run read-only against `gleamlearn_e2e`. The only difference it found is the deliberate `id` default (see below).

**Where the definitions conflict, and what the proposal does:**
- **Lengths:** the auth entity says `fullName`, `username`, `email` and `country` are plain `varchar`; the users-module entity gives lengths 150/100/255/100. TypeORM built the lengths, and the backend's DTOs and frontend limits match them. **Proposal: the lengths.**
- **Prisma** says `dateOfBirth` is `DateTime`, `preferredLearningPace` defaults to `'moderate'`, and `updatedAt` is nullable. Prisma has never created this table, and its only query doesn't read those columns. **Not followed.** Prisma is a client here, not the source of the DDL.
- **`id` default:** locally it is `uuid_generate_v4()`, which needs the `uuid-ossp` extension. On Supabase that extension lives in the `extensions` schema, so an unqualified call depends on `search_path`. **Proposal: the built-in `gen_random_uuid()`** (PostgreSQL 13+). TypeORM recognises both as uuid generation, and inserts leave `id` to the database either way.

## 3. `public.users`: the exact definition

| Column | Type | Null | Default |
|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` (PK) |
| `fullName` | `varchar(150)` | NOT NULL | |
| `username` | `varchar(100)` | NOT NULL | (UNIQUE) |
| `email` | `varchar(255)` | NOT NULL | (UNIQUE) |
| `passwordHash` | `varchar` | NOT NULL | |
| `dateOfBirth`, `educationType`, `secondarySchool`, `secondaryClass`, `secondaryStream`, `university`, `faculty`, `department`, `courseOfStudy`, `level`, `examAimOrGoals`, `preferredStudyTime`, `institution`, `levelOrClass`, `preferredLearningPace` | `varchar` | null | |
| `country` | `varchar(100)` | null | |
| `isEmailVerified` | `boolean` | NOT NULL | `false` |
| `verification_otp` | `varchar(6)` | null | |
| `otp_expires_at` | `timestamp` | null | |
| `refresh_token`, `restriction_reason`, `academicGoals` | `text` | null | |
| `is_restricted`, `isFrozen` | `boolean` | NOT NULL | `false` |
| `role` | `varchar` | NOT NULL | `'student'` |
| `created_at`, `updated_at`, `createdAt`, `updatedAt` | `timestamp` (without time zone) | NOT NULL | `now()` |
| `deletedAt` | `timestamp` | null | |

- **Constraints:** `PK_a3ffb1c0c8416b9fc6f907b7433 (id)`, `UQ_97672ac88f789774dd47f7c8be3 (email)` and `UQ_fe0bb3f6520ee0469504521e710 (username)`. These are TypeORM's own names. Each creates its unique btree index, and no other index exists or is needed.
- **No triggers.** The `updated_at`/`updatedAt` values are set by TypeORM, not by the database.
- **Relationships:** 8 tables reference `users.id` with `ON DELETE CASCADE`. All 8 user columns are `uuid` locally:

  | Table | Column | Constraint |
  |---|---|---|
  | `coin_transactions` | `user_id` | `FK_e85b0a5bf336ec85a9c84c1c391` |
  | `decks` | `userId` | `FK_d60e048034edfd232e0b8cedaeb` |
  | `enrollments` | `userId` | `FK_de33d443c8ae36800c37c58c929` |
  | `library_favorites` | `userId` | `FK_6839f79ea05acf9da28dee3fbb0` |
  | `library_saved_courses` | `userId` | `FK_7b79ae3ee5724ad537aaa2310f9` |
  | `user_achievements` | `userId` | `FK_3ac6bc9da3e8a56f3f7082012dd` |
  | `user_badges` | `userId` | `FK_7043fd1cb64ec3f5ebdb878966c` |
  | `xp_transactions` | `userId` | `FK_0c00e30c10daa7e964c62206729` |

  - They come from `@ManyToOne(() => User / 'User', { onDelete: 'CASCADE' })` in the entities.
  - **Auth doesn't need them.** No code hard-deletes users (deletion is a soft delete via `deletedAt`). They protect data integrity, so they are a separate PART with its own approval.
- **Not in the plan:** `notifications` (sign-up's welcome notification is wrapped in `try/catch`, and that table has no foreign key to `users`), `admins` (exists, untouched), and anything in `auth`.

## 4. `calendar_events`: separate, not part of this migration

- **Not needed for authentication.** It is used only by `src/calendar/calendar.service.ts`, through Prisma.
- **It can't be created faithfully today.** Prisma's model has `String` ids with no `@db.Uuid`, so it would produce `text` columns. A `text` `user_id` can't have a foreign key to the `uuid` `users.id`.
- It is missing locally too, so the calendar has never worked in any environment.
- **Needs a decision:** its model should get `@db.Uuid` (plus a DB-side default, or keep Prisma's client-side `uuid()`), before an SQL file is written for it.

## 5. Migration plan (for approval)

| Step | Who | What | Changes |
|---|---|---|---|
| 0 | Owner | Confirm Render's `DATABASE_URL` project and database (section 6) | nothing |
| 1 | Owner | Run **PART 0** (preflight) and compare with the expected results in the file. Stop if P2 says `users_exists = true`, P3 returns rows, or P5 shows a non-uuid column. | nothing (read-only) |
| 2 | Owner, **approval 1** | Run **PART 1**: create `public.users` (one transaction, `CREATE TABLE IF NOT EXISTS`, `lock_timeout 5s`), and revoke `anon`/`authenticated` access | 1 new empty table |
| 3 | Owner, **approval 2** | Run **PART 2**: the 8 foreign keys, `NOT VALID`. Each one is skipped, with a notice, if its table or uuid column is missing or a foreign key already exists. Optionally run **PART 2b** (`VALIDATE`) if P5 showed 0 rows everywhere. | constraints only |
| 4 | Owner | Run **PART 3**. Expected: V1 returns 0 rows, V2 shows 3 keys, V3 shows `false`/`false`, V4 shows 8 foreign keys, and V5 is unchanged. | nothing |
| 5 | Owner, **approval 3** | **Restart the Render service** (Manual Deploy → *Restart*; no new deploy, no environment change). See below for why. | process restart |
| 6 | Owner/me | Smoke tests (section 7) | test data only, after approval |

**Why the restart is required:**
- `AccountStatusService` detects the status columns once, at startup. On a database without `users`, the catalog query returns **zero rows, not an error**, so it caches "no status columns". It would then **not enforce** restricted, frozen or deleted accounts until restarted.
- The startup schema report (if deployed) is also only written at boot.
- The restart doesn't change environment variables and doesn't enable `DB_SYNCHRONIZE`.

**Rollback (PART 4):**
- It drops exactly the 8 named foreign keys and the table, **only while `public.users` has no rows** (otherwise it refuses), and never with CASCADE.
- Once real learners exist, rollback means deleting accounts. At that point, fix forward instead.
- PART 1 and PART 2 each run in a single transaction, so any error leaves the database unchanged.

**Supabase note:**
- New `public` tables are normally granted to `anon` and `authenticated` (the Data API, PostgREST). This table holds password hashes, codes and refresh tokens, so PART 1 revokes those grants.
- The backend connects with the `DATABASE_URL` role (`postgres`, the table's owner), so it is unaffected. RLS isn't enabled, and needs no policy.
- **Related, not changed:** P7 shows whether `public.admins` is readable via `anon` (the same exposure, for admin password hashes). If it is, that is a separate security fix to approve.

## 6. Confirm privately that Render's `DATABASE_URL` is this Supabase project

Do this yourself; don't paste the URL or password anywhere.

1. **Read the project reference in Supabase:** Dashboard → your project → *Project Settings → General → Reference ID*. It is also the part after `/project/` in the dashboard address.
2. **Read it in Render:** service → *Environment* → reveal `DATABASE_URL`. Look only at the user and host parts:
   - **Direct:** `postgresql://postgres:•••@db.<REF>.supabase.co:5432/postgres`
   - **Pooler:** `postgresql://postgres.<REF>:•••@aws-0-<region>.pooler.supabase.com:6543/postgres` (or port 5432)

   `<REF>` must equal the Reference ID.
3. **Check the database name after the last `/`.** It must be `postgres`, the database the SQL Editor uses. A different name means a different database inside the same project.
4. **Optional, read-only cross-check from the SQL Editor:**
   - Open `https://gleamlearn-backend.onrender.com/api/v1/health/database` in a browser. It runs `SELECT 1` on the backend's own connection.
   - Within a minute, run:
     ```sql
     SELECT usename, application_name, state, query_start
     FROM pg_stat_activity
     WHERE datname = current_database() AND query = 'SELECT 1' AND query_start > now() - interval '2 minutes';
     ```
   - A row whose `query_start` matches your request means the backend is connected to **this** database. (Through the pooler the client address is the pooler's, which is expected.)
   - If `query` shows `<insufficient privilege>`, or the pool reused a connection without it showing up, this check is inconclusive. Rely on steps 1–3 and 5.
5. **After PART 1:** a login with an unknown email returns **401** (before, 500). This proves it, because only the backend's database gained the table.

## 7. Smoke tests after the restart (in order)

1. `POST /api/v1/auth/login` with an unknown `@example.test` email returns **401** (not 500).
2. `POST /api/v1/auth/forgot-password` with an unknown email returns **201**.
3. *(Needs approval: creates one test account in production.)* Sign up with a test address, then verify with the emailed code, log in, open `/auth/me`, the dashboard, refresh, and log out. Then soft-delete the test account through the app, or keep it as a known test account.
4. Render logs: no `relation "users" does not exist`, and the schema report no longer lists `users`.

## 8. What this plan does not do

- No changes to `auth.*` or `admins`.
- No `DB_SYNCHRONIZE`, no environment changes, no deploy.
- No `calendar_events`.
- No data copied from local.
- No other tables created.
