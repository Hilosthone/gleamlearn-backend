# Production Recovery: Learner Sign-up and Login

Status **2026-10-20**. Production sign-up and login are **NOT fixed**. They count as fixed only after the deployed journey (step D) passes.

## A. What is known (evidence)

| Check (read-only) | Result | Meaning |
|---|---|---|
| `POST /api/v1/auth/login`, unknown email | **500** in about 1 s (should be 401) | The `users` lookup fails |
| `POST /api/v1/auth/forgot-password`, unknown email | **500** | The same single `users` lookup |
| `POST /api/v1/admin/auth/login` | 401 (correct) | The `admins` table works |
| `GET /api/v1/health/database` (same TypeORM connection) | `connected: true` | The database is reachable |
| Deployed Swagger | Batch 19–20 routes present | The backend runs current code |
| `https://gleamlearn.vercel.app` | Simulated login; `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email` and `/admin/login` → 404; build cached for about 9 days | **The frontend is an old build** that never calls the backend |

**Diagnosis so far:**
- The production `users` table doesn't match `src/auth/entities/user.entity.ts`.
- There are no migrations; the schema was created by TypeORM `synchronize`.
- Three definitions map `users`: two TypeORM entities and one Prisma model.
- The exact column isn't known yet. **Don't guess; confirm it with B.**

## B. Information needed from Render (one of these is enough)

### Option 1: the error line from the logs (easiest)

1. Open https://dashboard.render.com and click the **backend** service (`gleamlearn-backend`).
2. Click **Logs** in the left menu.
3. In another tab, open https://gleamlearn-backend.onrender.com/api/v1/health and wait until it loads, so the service is awake.
4. Trigger one failed login from any terminal:
   `curl -X POST https://gleamlearn-backend.onrender.com/api/v1/auth/login -H "Content-Type: application/json" -d "{\"email\":\"nobody@example.test\",\"password\":\"x\"}"`
5. In the Logs, find the red **`ERROR [ExceptionsHandler]`** line that appears, usually `QueryFailedError: column "…" does not exist`.
6. Copy **that line and the next 3 lines**. Before sending, delete anything that looks like a password, a connection string (`postgres://…`) or a token.

### Option 2: run the read-only SQL in Supabase (most complete)

Production is **Supabase** (owner confirmed 2026-10-20). Render has only `DATABASE_URL`.

1. Open https://supabase.com/dashboard → the GleamLearn project → **SQL Editor** → **New query**.
2. Paste the whole of `docs/diagnostics/users-schema-inspection.sql` and click **Run**.
   - It's read-only, runs in a READ ONLY transaction and returns no personal data.
   - If only the last result shows, select one numbered section at a time and run it.
3. The same file runs locally in **pgAdmin** (Query Tool on `mycoursea_db`), so the two can be compared. Locally, section 3 shows every column as `ok`.
4. Send back the results of **section 3** (each expected column and its status) and **section 4** (other columns). Also send sections 2, 5 and 6 if they return rows.

### Also tell me (setting names and non-secret values only)

- Render backend → Environment: is `NODE_ENV` set, and to what? Is `DB_SYNCHRONIZE` set? What is `SMTP_PORT` (a number, not a secret)? Is `JWT_SECRET` **present** (don't send it)?
- Render backend → Settings: the instance type (Free or paid). The free type is believed to block outgoing email (SMTP).
- Vercel → the frontend project → Settings → Environment Variables: the value of `NEXT_PUBLIC_API_URL`. It's public by design and ships in the browser bundle. Also, from Vercel → Deployments, the **commit** of the current production deployment.

## C. After section 3 is known (needs approval)

Follow the decision table at the top of `docs/migrations/proposed/2026-10-20_users_missing_columns.sql`:

- **`created_at` / `updated_at` missing, but `createdAt` / `updatedAt` exist:** **no migration.** Map the auth entity to the existing columns. This is a code change; it's tested locally, then deployed with approval.
- **`verification_otp`, `otp_expires_at`, `refresh_token`, `is_restricted` or `restriction_reason` missing:** add **only** those columns.
  - The change is metadata-only: no table rewrite, and existing rows are untouched.
  - A rollback is included, and it was dry-run on a disposable database.
- **Section 3 is all `ok`:** it's not a column problem. Check section 6 (privileges and RLS) and the Render log line instead.

## D. Deployment checklist (do not deploy until approved)

1. ☐ The schema fix is applied, and `users-schema-inspection.sql` section 3 shows only `ok`.
2. ☐ **Backend deploy** of the Batch 23–24 changes (non-blocking email, SMTP timeouts, delivery status). Before deploying, confirm on Render: `JWT_SECRET` is set (there's no fallback), `DB_SYNCHRONIZE` is unset, and `SUPER_ADMIN_*` is set if the admin doesn't exist yet.
3. ☐ Read-only checks after the deploy:
   - login with an unknown email → **401**;
   - forgot-password with an unknown email → **201**;
   - `GET /health/database` → connected.
4. ☐ **Frontend:** set `NEXT_PUBLIC_API_URL=https://gleamlearn-backend.onrender.com/api/v1` on Vercel (Production), then deploy the current `main`.
5. ☐ Check the deployed frontend:
   - `/auth/forgot-password` and `/auth/verify-email` return 200;
   - the login page shows the **Email** field, not "Email or Username".
6. ☐ **Deployed journey (owner, with a real inbox):** sign up → the verification email arrives → verify → log in → dashboard → refresh (still signed in) → log out → `/dashboard` redirects to the login page.
   - Only after this passes is production sign-up/login **fixed**.
   - If the email never arrives, the sign-up response says `verificationEmail: "failed"` or `"pending"`. That's an email-delivery issue (SMTP on Render), not an auth issue.
7. ☐ Rotate the exposed keys (`AI_API_KEY`, `ALOC_API_KEY`) at their providers, then update them on Render.
