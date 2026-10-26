# Known Issues

Status as of **2026-10-25** (the P0 below was resolved on 2026-10-24: `public.users` restored in production; kept for history). Each entry gives the evidence, the impact and what is needed. "Owner action" means it can't be fixed from the code alone.

## 🟥 P0: Sign-up, login and password reset fail on the deployed backend (owner action)

- **Symptom:** login and forgot-password return **500** on Render. Admin login works, and the database is connected.
- **Cause (owner-confirmed 2026-10-20):** **`public.users` does not exist in Supabase**. Every learner auth query fails with `relation "users" does not exist`.
  - Reproduced exactly on a disposable local database.
  - The earlier "missing columns" hypothesis is **refuted**.
- **Next:** `docs/PRODUCTION_RECOVERY.md`:
  1. Run the read-only `docs/diagnostics/users-schema-inspection.sql` (revision 2, catalog-only) to tell renamed, dropped and wrong-project apart.
  2. Apply the matching scenario from `docs/migrations/proposed/2026-10-20_users_table_recovery.sql`. **This needs approval**; nothing has been executed.
- `auth.users` is Supabase Auth's table. The backend doesn't use it, and it must stay separate.

## 🟧 P1: The deployed frontend is an old build with simulated login (owner action)

- `https://gleamlearn.vercel.app/auth/login` still runs the original simulation: the button waits 1.2 s and opens `/dashboard`, and no request reaches the backend.
- `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email` and `/admin/login` return **404** there. The build predates every auth batch; the CDN reported it about 9 days old on 2026-10-20.
- The real sign-in, sign-up, verification and session gate exist in the frontend repository but aren't deployed.
- Redeploying needs approval and is only useful after the P0 issue is fixed.

## 🟧 P1: Email delivery in production (Resend; owner actions)

- **SMTP timed out on Render.** Since 2026-10-25, email goes through **Resend** (HTTPS API); SMTP is kept for local development only. See `docs/EMAIL.md`.
- **Production email is BLOCKED until a domain is owned and verified** (owner, 2026-10-25: there's no custom domain yet, and `gleamlearn.vercel.app` can't be verified in Resend). With the testing sender, Resend refuses every recipient except the Resend account owner's own address (403 `validation_error`; exact text in `docs/EMAIL.md`). Learners get an honest `verificationEmail: 'failed'`.
- **Owner actions (when ready, each with approval):**
  1. Own and verify a domain in Resend.
  2. Set `RESEND_API_KEY` and `RESEND_FROM` on Render. Whether the key is already there is unconfirmed; the startup log `Mail provider: …` shows it after a deploy.
- Since Batch 23, auth responses **don't wait** for email. Learners can sign in without verifying, but can't verify or reset a password until delivery works.

## 🟥 Contained 2026-10-25: paid plans could be granted without payment

- `POST /subscription/subscribe` and `/subscription/upgrade` created an ACTIVE subscription with no payment. `POST /payments/verify` always answered `SUCCESS`, and `/payments/initialize` returned a fake checkout URL. `usage.service.ts` raises limits for active subscriptions.
- These only failed in production because the Prisma models don't exist.
- **Now:** all five (including the webhook) return **501** and change no data (`src/subscriptions/subscriptions.service.spec.ts`).
- **Re-enable only with a real payment provider:** server-side verification of the amount, currency and reference, and a signature-checked webhook (owner decision).

## Fixed in Batch 29 (2026-10-25)

- **Public profiles showed soft-deleted learners.** `GET /users/:username`, `/achievements` and `/stats` checked `user.deletedAt` on the auth entity, which has no such column, so it was always undefined. Deleted and frozen accounts are now "not found" (`AccountStatusService`).
- **Fabricated public data:**
  - `/users/:username/achievements` always returned an "Early Bird" achievement; it now returns real `user_achievements`.
  - `/stats` returned a 1-day streak for everyone; it now reads `user_streaks`, `enrollments` and `study_sessions`.
  - `level` was always undefined; it now comes from the `level` column.
- **Search returned 500** for everything except users: the Prisma models it used don't exist. It's rewritten on TypeORM.
  - User search no longer returns other learners' **email addresses**.
  - Question search never returns answers.
  - Materials search covers the learner's own notes only.
- **Sign-up:**
  - over-long values caused a 500; there are now length limits that return 400;
  - emails were case-sensitive; they're now normalised, with case-insensitive lookups (legacy capitalised accounts still work).
- **Fabricated or empty AI responses:** PDF export (fake URL), saved analysis and generated content (empty "success"), live-class stream, voice transcription and synthesis, and recommendations (generic, invented courses) now return **501 FEATURE_UNAVAILABLE**, in the backend and the AI service.

## Open (found or confirmed in Batch 29)

- **Email enumeration:** `POST /auth/resend-verification` answers 404 "User not found" for unknown emails (`forgot-password` doesn't). Changing it alters the API contract and the frontend message, so it needs a decision.
- **No case-insensitive unique index on `users.email`.** The application prevents case duplicates, but two concurrent sign-ups could still race. A unique index on `lower(email)` is a **schema change** (approval).
- **`POST /auth/refresh-token` is a mock** returning `'new-mock-jwt-token'`. The frontend doesn't use it; learner tokens last 7 days.
- **Uploaded files have no owner column (B4):** search can't include them safely; ownership needs a schema change.
- **CORS allows every origin by default.** `CORS_ORIGINS` can now restrict it; the recommended production value is `https://gleamlearn.vercel.app`. Setting it on Render is a production change (approval).
- **The AI service's quiz CRUD, quiz attempts and YouTube list/get routes return empty stubs.** The backend never calls them; persistence lives in the backend.

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

## Fixed in Batch 30 (2026-10-26, frontend integration)

- **Prisma models that don't exist returned 500:** calendar, reports and feedback, subscription plans, status and history, and usage now answer **501 FEATURE_UNAVAILABLE** (`src/common/prisma/prisma-model.ts`). Their tables are a schema change (approval).
- **`POST /planner/generate` stored two fixed sample sessions as an "AI study plan".** It now answers 501. `POST /planner` adds a learner's own session (validated, owner-scoped).
- **Goal updates accepted `id`/`userId` from the body**, which could overwrite or move another learner's goal. These are now stripped.
- **Admins could edit quizzes, tests and exams but not read them:** the learner reads reject admin tokens and strip the answer key. Added admin-only `GET /{quizzes|tests|exams}/manage/all` and `/manage/:id` (`content.manage`).
- **Every coin award failed** with a NOT NULL violation on `coin_transactions.type`. The type is now `EARN` or `SPEND`.
- **Any learner could list or delete any uploaded file.** These are admin-only until files have an owner (B4).

## Open (found in Batch 30)

- **Admin announcements never reach learners:** `POST /admin/notifications` and `/broadcast` write to `admin_notifications`, which the learner notifications API doesn't read.
- **Several admin analytics, finance and dashboard sub-endpoints return invented figures** (for example `platformScore`, `peakConcurrentUsers`, string completion rates). The admin UI shows only `/admin/dashboard/counts`.
- **No moderation input:** nothing writes `admin_reports` (learner reports are 501) or `admin_ai_generated_content`.
- **AI assistant chat has no memory:** each message goes to the AI service alone; stored history isn't sent.
- **Non-UUID ids return 500 on some routes** (for example `GET /ai/conversations/undefined`) instead of 400 or 404.
