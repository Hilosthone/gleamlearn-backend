# Known Issues

Status as of **2026-10-20**. Each entry gives the evidence, the impact and what is needed. "Owner action" means it can't be fixed from the code alone.

## 🟥 P0: Sign-up, login and password reset fail on the deployed backend (owner action)

- **Symptom:** `POST /api/v1/auth/login` and `POST /api/v1/auth/forgot-password` return **500** on `gleamlearn-backend.onrender.com`, even for an email that doesn't exist (they should return 401 / 201). Admin login and public routes work, and the database is connected.
- **Cause (narrowed):** the production `users` table doesn't match the auth `User` entity (`src/auth/entities/user.entity.ts`). The first operation of every learner auth flow, `SELECT … FROM users WHERE email = $1`, fails, which means a declared column is missing. The local database has every column.
- **Step-by-step guide:** `docs/PRODUCTION_RECOVERY.md`. The read-only queries are in `docs/diagnostics/users-schema-inspection.sql`, and a proposed fix SQL (not executed; dry-run on a disposable database) is in `docs/migrations/proposed/2026-10-20_users_missing_columns.sql`.
- **Find the column** (read-only), using either:
  - Render → backend service → **Logs**: look for `QueryFailedError: column "…" does not exist` after a failed login.
  - `SCHEMA_CHECK_URL='<production DATABASE_URL>' SCHEMA_CHECK_SSL=1 node test/live/schema-check.mjs`. It runs in a READ ONLY transaction and prints column names only.
- **Then:** add the column with a reviewed migration (needs approval), or map the entity to the column as it is named in production.
- **Columns that could be missing** (declared by the auth entity but not by the users-module entity): `verification_otp`, `otp_expires_at`, `refresh_token`, `is_restricted`, `restriction_reason`, `created_at`, `updated_at`, `courseOfStudy`, `examAimOrGoals`, `faculty`, `level`, `secondaryClass`, `secondaryStream`.

## 🟧 P1: The deployed frontend is an old build with simulated login (owner action)

- `https://gleamlearn.vercel.app/auth/login` still runs the original simulation: the button waits 1.2 s and opens `/dashboard`, and no request reaches the backend.
- `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email` and `/admin/login` return **404** there. The build predates every auth batch; the CDN reported it about 9 days old on 2026-10-20.
- The real sign-in, sign-up, verification and session gate exist in the frontend repository but aren't deployed.
- Redeploying needs approval and is only useful after the P0 issue is fixed.

## 🟧 P1: Email delivery from Render (verify on the service)

- Verification and reset codes are sent by SMTP (`SMTP_HOST`/`SMTP_PORT`). Render's free web services are understood to block outbound SMTP ports; this hasn't been verified on this service.
- Since Batch 23, auth responses **no longer wait** for email. Since Batch 24, sign-up and resend-verification report `verificationEmail: 'sent' | 'pending' | 'failed'`, after waiting at most 3 s. If SMTP is blocked, though, the codes never arrive: learners can still sign in (verification isn't required), but they can't verify or reset a password.
- **Check:** after a sign-up on Render, look for `Mail: the verification email could not be delivered` in the logs.
- **Options (need a decision):**
  - a paid Render instance, where SMTP is allowed;
  - an HTTP email API (a new provider, which needs approval).

## Fixed in Batch 23 (kept for reference)

- **Auth requests hung for about 30 s (up to about 2 min) when SMTP was slow or unreachable.** Every auth flow awaited the email, with no transport timeouts. Now emails are sent in the background and the transport has bounded timeouts. Reproduced and verified live: `test/live/smtp_blackhole.py` + `test/live/auth-timing.mjs`.
- **`SMTP_PORT=465` never enabled TLS:** the port was compared as a string. Fixed.

## Other open items (from earlier batches)

- B2: two `User` entities map one table with conflicting columns and types. Keep `DB_SYNCHRONIZE` off: sync drops and re-adds `users.fullName`.
- B4/B6: files, quizzes, tests and exams have no owner column. The migrations are drafted and await approval.
- `POST /auth/refresh-token` returns a fake token; `POST /auth/logout` is stateless.
- `POST /payments/webhook` is a no-op without signature verification.
- `PATCH /users/me/notification-preferences` and `/privacy-settings` echo the body without saving it.
- Credentials exposed in git history and to be rotated by the owner: `AI_API_KEY` (AI service), `ALOC_API_KEY` (backend).
