# Production Recovery: Learner Sign-up and Login

> **2026-10-23:** the owner confirmed `users` and `calendar_events` are missing, with no foreign keys to `users` and no learners. The current proposal is `docs/PRODUCTION_USERS_TABLE_RECOVERY_PLAN.md`, with SQL in `docs/migrations/proposed/2026-10-23_restore_public_users.sql` (not executed; awaiting approval). It supersedes the 2026-10-20 recovery file.

Status **2026-10-20** (revision 2). Production sign-up and login are **NOT fixed**. They count as fixed only after the deployed journey (section E) passes.

## A. What is known

| Evidence | Source | Meaning |
|---|---|---|
| **`public.users` does not exist**; `public.admins` and other user-related tables do; `auth.users` exists (Supabase Auth) | Owner, Supabase SQL Editor | The learner table the code needs is absent |
| Login (unknown email) → 500; forgot-password → 500; admin login → 401; `/health/database` connected | Read-only HTTP against Render | Consistent with a missing `users` table |
| **The same four results**, plus `relation "users" does not exist` in the log | Disposable local database with `users` dropped and sync off | **Reproduced exactly** |
| All definitions expect `users` in the default schema (two TypeORM entities with `@Entity('users')`, Prisma `@@map("users")`), with no schema option and no naming strategy | Code and git history | The table was never renamed in code |
| No code drops or renames tables | Search of `src` | Removal (if any) happened outside the app |
| `DATABASE_URL` containing `supabase.co` → TypeORM URL branch with TLS; `search_path` default (`public`) | `src/app.module.ts` | Render's `DATABASE_URL` alone is correct; no other variables are needed |
| `synchronize: true` hard-coded until `5a0c4cc` (2026-10-12), off since | Git history | Nothing has created or repaired tables since 2026-10-12 |

**Not yet known:** whether `users` was **renamed or moved**, **dropped**, never created in **this** database, or whether Render points at a **different Supabase project**. Section B decides it.

## B. Read-only diagnosis in Supabase (owner)

1. Supabase dashboard → the GleamLearn project → **SQL Editor** → **New query**.
2. Paste the whole of **`docs/diagnostics/users-schema-inspection.sql` (revision 2)** → **Run**. If only one result shows, run the sections D1–D9 one at a time.
   - It reads **only system catalogs**: it never queries an application table, so it can't fail on missing tables.
   - It runs in a READ ONLY transaction. Row counts are planner estimates; no rows are read.
3. Send back the results of **D2, D3, D4, D5, D6 and D9**. D4 is the most important.

**How to read it:**

| Result | Scenario |
|---|---|
| D4: only `users` (and `calendar_events`) MISSING; D5 shows no learner-like table except `admins`; D6 has **no** foreign key pointing to a users table | **B: dropped** (most likely with CASCADE) |
| D5 lists a table with `email` + `passwordHash` other than `admins`, and/or D6 foreign keys point to a different name or schema | **A: renamed or moved** (no data lost) |
| D4: **many** tables MISSING | **C: wrong database**; Render's `DATABASE_URL` points elsewhere |
| D9 returns a schema | The connecting role may resolve tables in that schema first; report it before choosing |

**Also check, without sharing any value:** does Render's `DATABASE_URL` contain the **same project reference** as the Supabase dashboard address (`supabase.com/dashboard/project/<reference>`)?
- For the pooler, the reference appears as `postgres.<reference>` in the user part.
- For a direct connection, it appears as `db.<reference>.supabase.co`.

Just answer yes or no.

## C. Repair (needs approval; `docs/migrations/proposed/2026-10-20_users_table_recovery.sql`)

- **A (renamed or moved):** one `RENAME`/`SET SCHEMA` back. No data change, no new table.
- **B (dropped):**
  1. **First** check Supabase → Database → **Backups** / point-in-time recovery for a copy that still has `users`.
  2. Otherwise, recreate the table **empty**, with the exact structure the app built. The foreign keys from the 8 dependent tables are added **NOT VALID**, so old rows are neither touched nor rejected.
  3. Previous learner accounts are not restored this way.
  - **Proven locally:** drop `users` CASCADE, apply B, then run the backend with sync off. `auth-timing` 5/5 and `backend-workflows` **54/54** pass (sign-up, verify, login, reset, restriction, enrolment).
- **C (wrong database):** correct `DATABASE_URL` on Render (owner). No SQL.
- **Supabase Auth (`auth.users`) stays separate.** The backend doesn't use it, and it must not be modified or used as a substitute.
- `…_users_missing_columns.sql` is **superseded**. It assumed the table existed.

## D. Information from Render (optional; it speeds things up)

1. Render → backend service → **Logs**.
2. Trigger one failed login:
   `curl -X POST https://gleamlearn-backend.onrender.com/api/v1/auth/login -H "Content-Type: application/json" -d "{\"email\":\"nobody@example.test\",\"password\":\"x\"}"`
3. Copy the `QueryFailedError …` line. Remove anything that looks like a connection string or token.
4. After the next approved deploy, the log also shows `Database schema check: … MISSING: …` at startup (read-only, new).

## E. Deployment checklist (do not deploy until approved)

1. ☐ The repair is applied (A, B or C). D4 of the diagnostic shows `users` in `public`.
2. ☐ **Backend deploy** of Batches 23–26 (non-blocking email, SMTP timeouts, delivery status, startup schema report). Confirm on Render first:
   - `JWT_SECRET` is set (there's no fallback);
   - `DB_SYNCHRONIZE` is unset;
   - `SUPER_ADMIN_*` is set if the admin doesn't exist yet.
3. ☐ The startup log shows `Database schema check: all 62 entity tables are present.` (or lists anything else that is missing).
4. ☐ Read-only checks:
   - login with an unknown email → **401**;
   - forgot-password with an unknown email → **201**.
5. ☐ **Frontend:**
   - Vercel builds `origin/main`, which is `5d879ae` (old). Push `main` (`dff2b87` and later), or merge `devbranch` into `main`.
   - Confirm `NEXT_PUBLIC_API_URL=https://gleamlearn-backend.onrender.com/api/v1` on Vercel Production.
6. ☐ Deployed site:
   - `/auth/forgot-password` and `/auth/verify-email` → 200;
   - the login page shows **Email** (not "Email or Username").
7. ☐ **Deployed journey (owner, real inbox):** sign up → the verification email arrives (or the page honestly says it couldn't be sent) → verify → log in → dashboard → refresh → still signed in → log out → `/dashboard` redirects to login.
8. ☐ Rotate the exposed keys (`AI_API_KEY`, `ALOC_API_KEY`) at their providers, then update them on Render.
