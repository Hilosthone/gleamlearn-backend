# GleamLearn integration audit (Phase 0)

**Date:** 2026-10-24.
**Code inspected:**
- Backend `origin/main` = `5ff08d8`, clean.
- Frontend `devbranch` = `0933d47`, clean.
- Deployed OpenAPI document `GET /api/docs-json` (469 operations).

**Method:** static scans of the source, plus read-only GETs to production (`/api/docs-json`). Nothing was changed or executed against a database.

**Not yet audited: the AI service.** `C:\Users\USER\Desktop\gleamlearn-ai-service` is outside this session's readable directories. It needs `/add-dir`. Only its backend-facing contract is covered here (section 6).

**Appendix:** [`API_ROUTE_INVENTORY.md`](API_ROUTE_INVENTORY.md). It is generated, and lists every route with its auth, throttle, Swagger coverage and whether the frontend defines a call for it.

---

## 1. Architecture (as implemented)

```
Browser (Next.js 16, gleamlearn-landing)
  └─ src/lib/http-client.ts → api.ts / learning.ts / learner-auth.ts / admin-api.ts   (only network layer; no stray fetch/axios)
       │  Bearer <JWT> from localStorage ('accessToken' learner, 'gleamlearn.adminAccessToken' admin)
       ▼
NestJS backend (Render)  /api/v1/*   458 routes, 64 controllers
  ├─ TypeORM → Supabase Postgres (61 entity tables; synchronize OFF; no migrations)
  ├─ Prisma  → same DB, schema defines only User + CalendarEvent (see §4.3)
  ├─ common/ai-service/ai-http.client.ts → FastAPI AI service (AI_SERVICE_URL, Bearer + X-API-Key = AI_API_KEY)
  ├─ MailService → nodemailer SMTP (times out on Render)
  └─ Cloudinary (files), Firebase (push), YouTube Data API, ALOC (past questions)
FastAPI AI service → NVIDIA NIM (per earlier batches; to be re-audited)
```

- **The frontend never calls the AI service directly.** Every AI feature goes through the backend (`src/lib/ai-endpoints.ts` only sets longer timeouts for those backend routes). This is the correct architecture; keep it.
- **Frontend configuration:** one variable, `NEXT_PUBLIC_API_URL`. `src/lib/config.ts` falls back to the production URL when it is unset.
- **Backend configuration names** (values not inspected):
  - Database: `DATABASE_URL`, `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`, `DB_SYNCHRONIZE`.
  - Auth: `JWT_SECRET`, `JWT_EXPIRES_IN` (default 7d), `ADMIN_JWT_SECRET`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`.
  - Mail: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `FRONTEND_URL`.
  - AI: `AI_SERVICE_URL`, `AI_API_KEY`, `AI_HTTP_TIMEOUT_MS`.
  - Other services: `CLOUDINARY_*`, `FIREBASE_*`, `YOUTUBE_API_KEY`, `ALOC_API_KEY`, `ALOC_BASE_URL`.
  - Runtime: `REQUEST_VALIDATION`, `AUTH_CODE_REQUIRES_EMAIL`, `PORT`, `NODE_ENV`.
  - **Defined locally but read nowhere yet:** `RESEND_API_KEY`, `NVIDIA_API_KEY`/`NVIDIA_BASE_URL` (these belong to the AI service), `OPEN_AI_KEY`.
  - There is no `.env.example`.
- **Global behaviour:**
  - CORS: `app.enableCors()` with no options, so **every origin is allowed**.
  - Validation: the global ValidationPipe is controlled by `REQUEST_VALIDATION`.
  - Rate limiting: `ThrottlerGuard` globally (3/s and 60/min per IP and route), with tighter `@Throttle` on 200+ routes.

## 2. Route inventory (summary)

| | Count |
|---|---|
| Routes in code | 458 (public 37, learner 281, admin 140) |
| Operations in deployed Swagger | 469. Flashcards and decks are also mounted without `/api/v1`. `GET /throttler/status` is missing from Swagger. |
| Swagger 2xx **response schemas** | **10** of 456 `/api/v1` operations |
| Writes with a documented request body | 119 of 187. 68 have none, including multipart `POST /files/upload`, `POST /quizzes/generate*`, `POST /notifications/token` and `PATCH /notes/{id}`. |
| Frontend API definitions (`src/lib`) | 336. **All match a real backend route** (the 2 non-matches are parser artefacts in `admin-api.ts`). |

**Public routes:** health (4), auth (8 learner and 5 admin), academic levels, public catalogues (achievements, badges, levels, plans), leaderboards (8), public profiles (3), throttler status and the payments webhook. Everything else needs a learner or admin token.

**Learner tokens:** `JwtAuthGuard` and `AuthGuard('jwt')` run the same `JwtStrategy`, which also enforces account status (restricted, frozen, deleted).

**Gamification is server-authoritative.**
- Learners can't award themselves XP or coins. `POST /xp/award` is admin-only.
- XP and coins are awarded only by quiz submission (`QuizzesService`).
- Learners can only `POST /coins/spend` (server-validated), `POST /streak/check-in` and `POST /streak/recover`.
- **Lesson completion awards nothing.** That's a product gap, not a security issue.

## 3. Frontend feature inventory

44 pages. They use the real API only where marked.

| Area | Page(s) | State | Backend available |
|---|---|---|---|
| Sign-up wizard, verify, login, forgot, reset, account state | `/auth/*`, `/account-state` | **Integrated** (browser-tested 2026-10-23 against a local backend) | Auth (11) |
| Onboarding | `/onboarding` | **Integrated**: academic profile, preferences, companion | Users, Personal AI Companion |
| Dashboard | `/dashboard` + Navbar | **Integrated**: `/auth/me`, XP, coins, streak, study-session stats, enrolled courses, notifications | XP, Coins, Streaks, Study Sessions, Courses, Notifications |
| Courses, course, lesson | `/learn`, `/learn/[courseId]`, `/learn/lesson/[lessonId]` | **Integrated**: list, search, enrol, unenrol, lessons, start, complete, progress | Courses/Topics/Enrollments (14), Lessons & Progress (8) |
| Settings | `/settings` | **Partial**: only change password. Profile editing is local state. | Users & Profile (14) |
| Lesson AI mode | `/learn/lesson/[lessonId]/ai-mode` | Static prototype | AI Tutor (11), AI (explain/summarize) |
| AI hub (assistant, chat, tutor, classroom, companion) | `/ai` (5 components, 0 API calls) | Static prototype | AI Tutor (11), Personal AI Assistant (11), Companion (4), Voice (3) |
| Practice (quizzes, tests, review) | `/practice` (8 components, 0 API calls) | Static prototype | Quizzes (14), Tests (13), Question Bank (5), Assessment Analytics (11) |
| Exams | `/exams` (5 components, 0 API calls) | Static prototype | Examinations (15), Exam Prep & Past Questions (12) |
| Library, upload, processing, generated class | `/library/*` | Static | Student Library (11), Files (8), AI Document Processing (14), YouTube (7), Notes (5) |
| Progress, history | `/progress`, `/history` | Static (26 and 31 literal records) | Learning Progress & Mastery (8), XP/Coins history |
| Planner | `/planner` | Static | Study Goals (7), AI Study Planner (9), Study Sessions (8), Calendar (7, broken; §4.3) |
| Notifications | `/notifications` | Static, although the Navbar uses the API | Notifications (9) |
| Premium | `/premium` | Static, "coming soon" | Subscriptions (9, unsafe or broken; §4.3) |
| Support | `/support` | Static | Reports & Feedback (5, broken; §4.3) |
| Flashcards, leaderboards, achievements, badges, search, recommendations | **No page** | — | Flashcards + Decks (24), Leaderboards (10), Achievements (3), Badges (2), Search (6), Recommendations (6) |
| Admin console | `/admin/*` | **Integrated** for login, dashboard, users, content, profile and settings. `/admin/moderation` and `/admin/assessments` show an explicit "Not connected" panel listing their endpoints. | Admin (140 routes) |

**Classification (per the brief):**
- **Already supported:** auth, onboarding, dashboard, courses and lessons, and part of the admin console.
- **Backend exists, frontend missing:** practice, exams, flashcards, library, files, documents, YouTube, notes, progress, history, planner, goals, sessions, notifications page, AI hub and tutor, leaderboards, achievements and badges, profile editing, recommendations.
- **Frontend exists, backend broken:** search (except users), reports and feedback, subscriptions, usage limits, calendar.

## 4. Inconsistencies and defects found

### 4.1 Email (Phase 1)
1. **SMTP times out on Render.** This is the reason for the move to Resend. `resend@6.31.0` is **already installed but unused**, and `RESEND_API_KEY` is defined locally (presence checked only).
2. **Every emailed link points to a route that doesn't exist:**
   - `${FRONTEND_URL}/verify-email?token=…` (the real route is `/auth/verify-email`, and it needs `email` plus code);
   - `/reset-password?token=…` (real: `/auth/reset-password`);
   - `/login` (real: `/auth/login`);
   - `/settings/security` (doesn't exist).
3. `MailService` logs recipient addresses (personal data). Its send path is duplicated across 7 methods, with `from` and `FRONTEND_URL` re-read in each one.
4. **Resend sending restriction:** without a verified domain, Resend only accepts the shared test sender, and only delivers to the Resend account owner's own address. **Learners won't receive verification emails until a domain is verified in Resend** (DNS records; owner action). The code must make the sender configurable (`MAIL_FROM`), so a verified domain needs no code change.

### 4.2 Security
1. **`POST /subscriptions/subscribe` grants an ACTIVE subscription to any plan without payment.** `initializePayment` and `verifyPayment` are placeholders (`verifyPayment` always returns `SUCCESS`), and the webhook doesn't verify signatures. Today these calls fail anyway (§4.3), but the logic must be fixed before the Prisma models exist.
2. **Public profile shows soft-deleted learners.** `GET /users/:username` (and `/achievements`, `/stats`) check `user.deletedAt` on the auth entity, which has no such property. `level: user.levelOrClass` is always undefined for the same reason.
3. **Fake data from the backend:** `GET /users/:username/achievements` returns a hard-coded "Early Bird" placeholder.
4. **CORS allows every origin.** Bearer tokens mean this is not a CSRF issue, but it should be restricted to the frontend origins.
5. **Tokens are kept in `localStorage`**, which an XSS bug could read. There is no refresh: `POST /auth/refresh-token` is a mock returning `'new-mock-jwt-token'`, and the learner token lives 7 days. Moving to httpOnly cookies is an architectural decision, not part of this work.
6. **No `@MaxLength` on the sign-up DTO.** Over-long values cause a 500 (varchar limits).
7. **Emails are not case-normalised.** `Ada@x.com` and `ada@x.com` are separate accounts. The table has only one (test) account now, so this is the cheapest time to fix it.
8. **Production `public.admins`** has RLS on with no policies and `anon`/`authenticated` SELECT grants. It isn't exposed today, but it should be hardened (separate approval).

### 4.3 Broken backend features (Prisma models that don't exist)
`schema.prisma` defines only `User` and `CalendarEvent`. The code also calls `subscriptionPlan`, `userSubscription`, `report`, `feedback`, `course`, `topic`, `question`, `quizAttempt`, `studyMaterial` and `aiUsageLog`. They are `undefined` at runtime, so the call throws and returns 500.

| Feature | File | Effect | Likely fix |
|---|---|---|---|
| Search (courses, topics, questions, materials) | `search.service.ts` | 500 (user search works) | Rewrite against the existing TypeORM entities. No schema change. |
| Reports & feedback | `reports.service.ts` | 500 | New TypeORM entities **and tables**, so a production schema change (approval) |
| Subscriptions | `subscriptions.service.ts` | 500 (and unsafe logic, §4.2) | Product decision: payment provider. Until then, return 501. |
| Usage limits | `usage.service.ts` | 500 (no AI route depends on it) | Re-implement or retire |
| Calendar | `calendar.service.ts` | 500: `calendar_events` doesn't exist, and the model can't reference `users.id` (text vs uuid) | Schema decision plus a table (approval) |

### 4.4 Frontend
1. **Duplicate dashboard requests:** the Navbar and the page both call `loadLearnerStats()`, so each load sends 2 requests to `/xp`, `/coins` and `/streak`. `GET /xp` allows exactly **2 per 2 s**, so any re-render or navigation within that window gets a 429.
2. Static pages show invented statistics: `/progress`, `/history`, `/planner`, `/notifications`, `/library` and `/premium`.
3. The README dates from 2026-09-13. `docs/API_INTEGRATION.md` and `FRONTEND_BACKEND_INTEGRATION_AUDIT.md` are from 2026-10-12/13, before the registration work.

### 4.5 Swagger
Response schemas are missing on almost every operation (10 of 456), and 68 writes don't document their body. The frontend's typed API layer was written against live responses, not against Swagger.

## 5. Phase 1 design: email (Nodemailer → Resend)

```
AuthService ──(unchanged calls)──> MailService (templates, links, subjects; no transport code)
                                        └─> MailTransport (interface: send({to, subject, html, text?}))
                                              ├─ ResendTransport  (default when RESEND_API_KEY is set; official `resend` SDK)
                                              └─ SmtpTransport    (nodemailer; local dev and the test/live SMTP sink)
```

- **Unchanged:**
  - OTP generation, expiry and binding;
  - `verify-email`, `resend-verification`, `forgot-password` and `reset-password` behaviour;
  - the 3 s non-blocking send budget (`sendWithinBudget`) and the `sent`/`pending`/`failed` delivery states;
  - throttles;
  - templates.
- **Fixed:**
  - the link routes (§4.1.2). The verification link will carry `email` and the code, to match the frontend page.
  - Recipients are no longer logged.
  - Resend errors are mapped to the existing "failed" state, without leaking the error.
- **Provider selection:** `MAIL_PROVIDER=resend|smtp` (default: `resend` if `RESEND_API_KEY` is set, otherwise `smtp`). The live test harness keeps working through SMTP.
- **Sender:** `MAIL_FROM`. Locally, without a verified domain, the Resend test sender is used. That can only deliver to the account owner's address, so it must be **tested locally only with that address**.
- **Tests:**
  - unit tests with a fake transport;
  - a Resend transport test with the SDK mocked (no real sends in CI);
  - one real send to the owner's address, **only with your approval**.

## 6. AI service (audited 2026-10-24, `gleamlearn-ai-service` `main` = `cafc8ef`)

**Uncommitted, from an earlier batch:** the URL policy (`dependencies.py`), its test, the extraction test change and `docs/` (10 files). Kept as is.

**Shape:** FastAPI app (`main.py`), 10 routers, **73 routes**, stateless (no database). It has one model provider: **NVIDIA NIM** through the OpenAI-compatible `AsyncOpenAI` client (`NVIDIA_BASE_URL`, `NVIDIA_MODEL`, `NVIDIA_API_KEY`), with a per-request timeout and bounded retries. Rate limits are per IP (`slowapi`, 3–30/min per route).

**Configuration names:** `AI_API_KEY`, `NVIDIA_API_KEY`, `NVIDIA_BASE_URL`, `NVIDIA_MODEL`, `NVIDIA_MAX_RETRIES` and timeouts, `ALLOWED_DOCUMENT_HOSTS` (default `res.cloudinary.com`), `MAX_DOCUMENT_BYTES`. `OPENAI_API_KEY`/`OPEN_AI_KEY` are read but unused by any live route.

**Auth:** **all 73 routes require the service key.** Six routers use a router dependency (`verify_token`/`verify_api_key`); `documents` and `quizzes` call `verify_token()` in every handler (checked per handler). The service refuses to start without `AI_API_KEY`. Accepted forms: `Authorization: Bearer <key>` or `X-API-Key`, compared in constant time.

**Backend → AI map (verified both sides):** every path the backend calls exists.

| Backend module | AI-service route(s) | State |
|---|---|---|
| `ai` (documents) | `POST /api/v1/ai/documents/{id}/{analyze, generate-notes, -summary, -flashcards, -questions, -quiz, -test, -exam, create-course, generate-live-class}` | **Real generation.** Fetches the stored Cloudinary file (allowlisted host, size cap, PDF/DOCX/text), truncates to 15,000 characters, one model call. The backend **does not persist** the result. |
| `ai` (documents) | `GET …/analysis`, `GET …/generated-content`, `GET …/live-class-stream` | **Stubs:** "success" with no data |
| `ai` (documents) | `POST …/export-pdf` | **Fabricated:** returns a Supabase download URL that doesn't exist |
| `personal-ai` | `POST /api/v1/chat`, `/api/v1/ai/{explain, summarize, generate-example, generate-practice, evaluate-answer, explain-mistake}` | Real generation |
| `ai-tutor` | `POST /api/v1/ai-tutor/{message, teach, explain, generate-diagram, drawing-instructions}` | Real generation; sessions and messages persisted by the backend |
| `quizzes`, `tests`, `exams` | `POST /api/v1/{quizzes,tests,exams}/generate[-from-course\|-from-document\|-from-topic]` | Real generation; persisted by the backend |
| `youtube` | `POST /api/v1/youtube/{id}/process` | Real: transcript, then generation; persisted by the backend (`youtube_resources`) |
| `ai-voice` | `POST /api/v1/ai/voice/{transcribe, respond, synthesize}` | **Only `respond` (text) works.** There's no speech provider: transcribe and synthesize return placeholders. |
| `recommendations` | `GET /api/v1/recommendations[/courses\|topics\|quizzes\|revision\|exams]?userId=` | **Ignores the learner:** a fixed generic prompt, so the model invents courses and ids that aren't in the catalogue. Not usable as a feature without a redesign (compute from the real catalogue and progress). |
| — | AI-service quiz CRUD and attempts, YouTube list/get/delete/status, `ai-companion/{chat,interact}` | Not called by the backend. They return empty stubs; persistence lives in the backend. |

- **RAG:** **not implemented anywhere.** No chunking, embeddings or vector store; documents are truncated to 15,000 characters. Document as a future feature; no paid service is added.
- **Frontend → AI:** none directly (correct). All AI features go through the backend with the learner JWT, and the backend adds the service key, so the key never reaches the browser.
- **Tests:** `python -m unittest discover -s tests -t .` gives **30/30 OK** (2026-10-24; dummy keys, no network). `pytest` isn't installed.

## 7. Blockers and decisions needed

| # | Item | Owner | Blocks |
|---|---|---|---|
| B1 | ~~`/add-dir` for the AI service~~ done 2026-10-24 | — | — |
| B1b | Whether `RESEND_API_KEY` is set on **Render** can't be checked from here (no Render access). After the next approved deploy, the startup log line `Mail provider: …` shows it (never the value). | you | Production email |
| B2 | **A domain verified in Resend**, and `MAIL_FROM` on it. Until then, production verification emails reach only the Resend account owner. | you (DNS) | Real learner verification |
| B3 | Set `RESEND_API_KEY` (and later `MAIL_FROM`) on **Render** (production configuration) | you, with approval | Production email |
| B4 | Deploying the new frontend (`devbranch`) to Vercel. Production still serves `5d879ae`, where `/auth/verify-email` and `/auth/forgot-password` return 404. | you, with approval | End-to-end auth on the live site |
| B5 | New tables for reports and feedback, and calendar (schema changes) | you, with approval | Support/feedback, calendar |
| B6 | Payments: provider choice. Until then, subscribe, upgrade and verify should refuse (501) instead of granting. | you (product) | Premium |
| B7 | Optional security decisions: CORS allowlist (needs the production origins), httpOnly-cookie sessions with refresh, `admins` grant hardening | you | — |

## 8. Implementation plan

**Revised order (owner, 2026-10-24):**
1. Contain the critical security issues (subscriptions and payments).
2. Resend email.
3. Backend reliability: the Prisma-model failures, profile and soft-delete, the fake achievements, the AI-service stubs the backend exposes (`export-pdf`, `analysis`, `generated-content`).
4. Frontend and AI integration in coherent batches.

The table below keeps the work items; the order above takes precedence.

Each phase ends with its tests. No deploy, commit or push. Production-affecting steps stop for approval.

| Phase | Work | Repos | Notes |
|---|---|---|---|
| **1. Email** | §5: the `MailTransport` abstraction, the Resend transport, link fixes, no PII in logs, tests | backend | Local only; one real test send only with approval |
| **2. Backend API** | 1. Fix the public-profile soft-delete and level bug, and remove the fake achievements (return real `user_achievements`). 2. Make subscribe/upgrade/verify/initialize return **501** until payments exist (stop free grants). 3. Rewrite search on TypeORM. 4. Normalise email case at sign-up, login, verify, resend and reset. 5. Add `@MaxLength` to the sign-up DTO. 6. Add Swagger response DTOs and bodies for every **learner route the frontend uses**. 7. Make CORS configurable (`CORS_ORIGINS`; default unchanged until set). | backend | No schema changes. Reports/feedback, calendar and usage are documented as gaps (B5). |
| **3. Frontend core** | Share one stats query between the Navbar and the dashboard. Profile editing in `/settings` (`PATCH /users/me`, academic profile, preferences, picture, privacy and notification settings, freeze, delete). A `/notifications` page on the real API. Session-expiry handling already exists, so keep it. | frontend | |
| **4. Learning** | `/library` (saved courses, favourites, materials) with search, filters and pagination. `/progress` and `/history` from Learning Progress & Mastery and the XP/coin histories. Uploads and notes. | frontend | |
| **5. Practice and gamification** | Rebuild `/practice` and `/exams` on Quizzes, Tests, Exams, Exam Prep and Question Bank (generate → start → answer → submit once → result → review). Flashcards and decks with daily review. Leaderboards, achievements and badges pages. | frontend | Answer and submit calls get a single-flight guard |
| **6. AI** | After B1: the AI hub, tutor sessions, assistant, companion, lesson AI mode, document processing (upload → process → status → generated content), YouTube ingestion. All through the backend. | all three | No new paid providers |
| **7. Docs** | Backend: `README.md` and `docs/{API,AUTH,EMAIL,INTEGRATION,DATABASE,AI_INTEGRATION,PRODUCTION}.md`, plus the regenerated route inventory. Frontend: README, `docs/API_INTEGRATION.md` (endpoint → feature → file, generated from the scans). AI service: the full documentation set. | all three | Derived from code and the OpenAPI document |
| **8. Verification** | Backend: vitest (34 specs), oxlint, build, plus the `test/live` suites against a local disposable DB. Frontend: unit tests (9 files), tsc, eslint (417/87 baseline), build, the CDP browser suite extended to each new feature. AI service: pytest, static checks, startup. | all three | Each result reported as PASS / FAIL / NOT RUN |

**Size, honestly:**
- Phases 1–3 are well-bounded.
- Phases 4–6 rebuild about 13 static screens and 3 prototype component trees (~1,850 lines) against about 150 backend routes. That is several large batches, not one pass.
- Recommended order: 1 → 2 → 3, then 5 (practice is the core learning loop), then 4, then 6.

---

## 9. Update after Batch 29 (2026-10-25)

Details: `docs/IMPLEMENTATION_CHANGELOG.md` (Batch 29). All changes are local, and none is committed. There are no schema changes, no new tables and no production changes.

### 9.1 Confirmed root causes and status

| Issue | Root cause | Status |
|---|---|---|
| Deleted learners on public profiles | The `deletedAt` check ran on an entity without that column (B2) | **Fixed.** `AccountStatusService` hides deleted and frozen accounts. |
| Fake "Early Bird" achievement and placeholder stats | Hard-coded placeholders | **Fixed.** Real `user_achievements`, `user_streaks`, `enrollments` and `study_sessions`. |
| Search 500 | Prisma models that don't exist | **Fixed.** TypeORM; no emails, answers or other learners' material leak. |
| Sign-up 500 on long input | No DTO length limits | **Fixed.** 400 with field messages, matching the wizard limits. |
| Case-sensitive emails | Exact string storage and lookup | **Fixed.** Normalised storage and case-insensitive lookup, with no data migration. |
| Fabricated PDF URL and empty "success" AI responses | AI-service stubs forwarded as success | **Fixed.** `501 FEATURE_UNAVAILABLE` in the backend and the AI service. |
| Frontend showed fake success | Library upload → processing → generated class, and lesson AI mode, were scripted | **Fixed.** Honest `FeatureUnavailable` states; 501 → kind `not_implemented` (not transient, no "try again"). |
| CORS open to every origin | `enableCors()` without options | **Option added** (`CORS_ORIGINS`). Production unchanged until the owner sets it. |

### 9.2 Email (Resend)

- **Local:** `RESEND_FROM="GleamLearn <onboarding@resend.dev>"`; links stay on `https://gleamlearn.vercel.app`.
- **Verified live through the app:** the Resend test address gets `sent`. A normal address gets an honest `failed` (403 `validation_error`: *"You can only send testing emails to your own email address … please verify a domain"*).
- **Production email is BLOCKED** until the owner owns and verifies a domain. `vercel.app` can't be verified.

### 9.3 Remaining security and functional gaps (not changed in this batch)

- `POST /auth/resend-verification` reveals whether an email is registered (404).
- `POST /auth/refresh-token` is a mock; tokens live 7 days in `localStorage`.
- Uploaded files have no owner (B4).
- The library index page (`/library`) still lists invented "generated class" cards. They now lead to honest "not available" screens; the real integration is library work.
- Static prototypes still not integrated: `/ai`, `/practice`, `/exams`, `/progress`, `/history`, `/planner`, `/notifications`, `/library`.
- The AI service's quiz CRUD, attempts and YouTube list/get routes are empty stubs (not called by the backend).
- Document-generation results aren't persisted, so "saved content" can't exist until they are.
- RAG, personalised recommendations and speech (STT/TTS) aren't implemented anywhere, and are now reported as unavailable.

### 9.4 Needs a schema change or production configuration (approval required)

| Item | Kind |
|---|---|
| Unique index on `lower(users.email)` | Schema |
| `files.userId` ownership (B4) | Schema |
| Reports/feedback tables; `calendar_events` (uuid FK) | Schema |
| Persisting generated document content (the `ai_generated_contents` entity exists; using it may need columns) | Schema review |
| `RESEND_API_KEY`, `RESEND_FROM` on Render, after a domain is verified | Production config |
| `CORS_ORIGINS=https://gleamlearn.vercel.app` on Render | Production config |
| Deploying backend, AI service and frontend | Deployment |

### 9.5 Recommended next batch

**Frontend core and practice loop.** Every item below already has a real backend; no schema change is needed.
1. Share one stats query between the dashboard and the Navbar (removes the duplicate `/xp`, `/coins`, `/streak` requests).
2. Profile editing in `/settings`.
3. A real `/notifications` page.
4. Rebuild `/practice` on the real quiz/test endpoints: generate → start → answer → submit once → result → review.
