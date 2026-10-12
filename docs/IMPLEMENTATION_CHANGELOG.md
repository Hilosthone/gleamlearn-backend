# GleamLearn Implementation Changelog

## Project context

GleamLearn has two services:

- **Main backend**: NestJS + TypeScript (`mycoursea-backend`, this repository).
- **AI service**: Python + FastAPI (`gleamlearn-ai-service`, a separate repository). It calls NVIDIA NIM through the OpenAI-compatible API.

A read-only audit on 2026-10-11 found configuration, integration, security and cost problems. Issue IDs below (B = backend, C = AI service, D = integration) refer to that audit.

This document records each correction batch: what changed, the evidence that it works, and what is still open. Paths are relative to each repository's root. AI-service paths start with `gleamlearn-ai-service/`.

**Status legend**

| Label | Meaning |
|---|---|
| ✅ Verified | Code changed and covered by passing automated tests or checks listed in the batch |
| 🟡 Partially verified | Code changed; some behaviour is untested (for example, a live provider or a real database) |
| ⬜ Not implemented | Planned or awaiting approval |

**Approval boundaries in effect:**
- No database migrations, destructive DB operations, production deployments or credential rotations without explicit approval.
- No provider switch and no paid inference tests.

---

## Batch 1: Schema auto-sync (B1) and quiz reward policy (B3)

**Status:** ✅ Verified by unit tests and type-check. Not exercised against a real database.

### B1: TypeORM `synchronize` was always on

- **Problem:** `synchronize: true` was hard-coded in both database branches of `src/app.module.ts`, so TypeORM altered the live schema on every boot. Two entities map to the same `users` table (audit B2), and the sync could add, alter or drop columns based on whichever entity definition won. That is a data-integrity risk.
- **Implementation:** `synchronize` is now read from `DB_SYNCHRONIZE`. It is `true` only when the variable equals `true` (case-insensitive); the default is `false`.
- **Files changed:** `src/app.module.ts`
- **API compatibility:** No API surface affected.
- **Database impact:**
  - Existing records and schema are not changed by this code.
  - Behavioural change: new entities or columns added to code will **no longer** be created automatically. Schema changes now need an approved migration, or a deliberate run with `DB_SYNCHRONIZE=true` against a non-production database.
  - If production currently relies on auto-sync to create tables for features not yet deployed, those tables will not appear until handled explicitly.
- **Configuration:** New optional variable `DB_SYNCHRONIZE` (default `false`). Leave it unset or `false` in production.

### B3: Quiz rewards could be farmed

- **Problem:** `QuizzesService.submitAttempt` returned a hard-coded score of 85, so every submission "passed" and awarded 50 XP and 20 coins, with no limit. Coins are spendable (`CoinsService.spendCoins`).
- **Implementation:**
  - New pure grader `gradeQuiz()` scores `answers` against the answer key stored in `quiz.questions`.
    - Answer-key fields: `correctAnswer`, `correct_answer`, `answer` or `correct`.
    - Options: `options` or `choices`. A letter answer (`"B"`) and its option text compare equal.
    - Answers can be keyed by question `id`/`questionId`/`number`, by `q1..qN`, by index, or sent as an array.
  - Reward policy:
    - Rewards are given only if the attempt was graded (the quiz has an answer key) and the score is at least 50%.
    - Rewards are given **once per user per quiz**. The XP description now carries a stable marker `[quiz:<quizId>]`, and `XpService.hasAwardForReference()` checks for it before awarding.
- **Files changed:**
  - `src/quizzes/quizzes.service.ts` (modified)
  - `src/xp/xp.service.ts` (modified: added `hasAwardForReference`)
  - `src/quizzes/utils/grade-quiz.util.ts` (new)
  - `src/quizzes/utils/grade-quiz.util.spec.ts` (new)
  - `src/quizzes/quizzes.service.spec.ts` (new)
- **API compatibility:**
  - `POST /api/v1/quizzes/:id/submit` keeps its path, request body (`SubmitQuizDto`) and all existing response fields: `status`, `quizId`, `score`, `totalQuestions`, `correctAnswers`, `xpAwarded`, `coinsAwarded`, `message`.
  - Two **additive** fields: `graded` and `passed`.
  - The values are now real: `score` can be below 50, and `xpAwarded`/`coinsAwarded` can be 0. A frontend that assumed every submission passes will now show real results.
- **Database impact:**
  - No schema change.
  - Existing XP and coin records are untouched, including any previously farmed rewards. Old records have no `[quiz:<id>]` marker, so a user who was rewarded before this change can earn the reward **one more time** for the same quiz.
  - Cleaning up previously farmed rewards would alter records, so it has not been done and needs explicit approval.
- **Configuration:** None.
- **Testing and verification:**

  | Command | Result |
  |---|---|
  | `npx tsc --noEmit -p tsconfig.build.json` | ✅ exit 0 |
  | `npx vitest run src/quizzes` | ✅ 2 files, 8 tests passed (grader cases; award once; no re-award; no award on fail; no award without answer key) |

- **Outstanding issues and risks:**
  - The once-per-quiz check is a read followed by a write, not a DB unique constraint. Two simultaneous submissions could both pass the check. The existing route throttle (1 request per 3 s per client) narrows the window. A unique constraint would need a schema change.
  - Quiz attempts are still not persisted. `startAttempt`, `getResults` and attempt history remain placeholders.
  - `tests.service.ts` and `exams.service.ts` `submitAttempt` still return hard-coded scores. They award no XP or coins, so this is not a farming risk, but grading there is still fake.

---

## Batch 2: Backend → AI service client, document paths and payload (D1, D2, backend side of D3, B13)

**Status:** ✅ Verified by unit tests and type-check (HTTP calls mocked). 🟡 Not verified end to end against a running AI service, because the local `AI_API_KEY` values still differ (see Batch 3 manual actions).

### Problems

- **D1:** `AiService` called `/api/v1/documents/{id}/…`, but the AI service serves `/api/v1/ai/documents/{id}/…`. The deployed AI service returned 404 (verified during the audit). Every document feature failed: analyze, notes, summary, flashcards, questions, quiz, test, exam, course, live class and export.
- **D2:** Even with correct paths, the backend sent only `GenerateAiDto` (tone, language, …). The AI service's `AiRequest` requires `fileId` and `fileUrl`, so it would return 422. `FilesModule` was imported but never used.
- **D3 (backend side):** Seven services each built their own axios call, with hard-coded fallback secrets (`'674930'`, `'your_secret_token'`, `'your_shared_secret'`). They used inconsistent headers (some `Authorization: Bearer`, some `X-API-Key`). `PersonalAiService` defaulted to the **production** Render URL.
- **B13:** None of the backend → AI calls had a timeout, so a hung or cold-starting AI service could hold requests indefinitely.

### Implementation

- New `getAiHttpClient()`: one shared axios instance.
  - `baseURL` comes from `AI_SERVICE_URL`, defaulting to `http://127.0.0.1:8000` and never to production.
  - Sends `AI_API_KEY` as **both** `Authorization: Bearer` and `X-API-Key`, so it works with the current and the updated AI service. There is no fallback secret.
  - `timeout` comes from `AI_HTTP_TIMEOUT_MS` (default 120000 ms).
  - **No automatic retries.** Generation requests are not idempotent, and every retry is billed by the provider. Bounded retries are applied at the provider call in the AI service instead (Batch 4).
- `AiService`:
  - Looks up the file with `FilesService.findFileById(id)`. A missing file now returns 404 before any AI call.
  - Posts `{ fileId, fileUrl, options: <GenerateAiDto> }` to `/api/v1/ai/documents/{id}/{action}`.
  - The three GET endpoints use the corrected path.
- `ai-tutor`, `ai-voice`, `recommendations`, `personal-ai`, `quizzes`, `tests`, `exams` and `youtube` now use the shared client. Their paths, payloads and existing error handling are unchanged. (Error-handling improvements are B9, Phase 2.)

### Files changed

- New: `src/common/ai-service/ai-http.client.ts`, `src/common/ai-service/ai-http.client.spec.ts`, `src/ai/ai.service.spec.ts`
- Modified:
  - `src/ai/ai.service.ts`
  - `src/ai-tutor/ai-tutor.service.ts`
  - `src/ai-voice/ai-voice.service.ts`
  - `src/recommendations/recommendations.service.ts`
  - `src/personal-ai/personal-ai.service.ts`
  - `src/quizzes/quizzes.service.ts`
  - `src/tests/tests.service.ts`
  - `src/exams/exams.service.ts`
  - `src/youtube/youtube.service.ts`

### API compatibility

- No public endpoint path, request body or response shape changed. Frontend-facing routes under `api/v1/ai/documents/:id/*` are the same; only the backend's **outgoing** call to the AI service changed.
- Behaviour difference: document endpoints now return **404** when the file ID doesn't exist (before, they reached the AI service and failed there).
- Internal auth: the backend now sends both header styles. The AI service accepts both after Batch 3, and the old AI service still sees the header it expects on each route, so the deploy order doesn't matter.

### Database impact

None. Reads only (`files` lookup). No schema or record changes.

### Configuration

- `AI_SERVICE_URL`: existing. The default is now always local.
- `AI_API_KEY`: existing. There is no fallback value any more.
- `AI_HTTP_TIMEOUT_MS`: new, optional, default `120000`.

### Testing and verification

| Command | Result |
|---|---|
| `npx tsc --noEmit -p tsconfig.build.json` | ✅ exit 0 |
| `npx vitest run src/ai src/common src/quizzes` | ✅ 4 files, 15 tests passed. Covers: corrected path for all 10 POST and 3 GET actions; `{fileId, fileUrl, options}` payload; 404 without an AI call for a missing file; upstream status propagated; both auth headers; timeout; local default; no hard-coded secret. |

### Outstanding issues and risks

- Not tested against a live AI service. Generation endpoints call NVIDIA, which is paid, so that is intentionally not run.
- The `analysis`, `generated-content` and `live-class-stream` routes reach the AI service correctly now, but the AI service still returns placeholder data for them (audit C10).
- The backend still passes the AI service's `detail` text through to clients for document, quiz, test and exam routes. That is B9, Phase 2.

---

## Batch 3: Unified internal authentication in the AI service (C3, AI side of D3)

**Status:** ✅ Verified with offline tests (dummy keys; no provider calls).

### Problem

- Document, quiz, test and exam routers required `Authorization: Bearer <AI_API_KEY>`. The others (chat, AI companion, tutor, voice, recommendations, YouTube) required `X-API-Key`.
- Every router had a hard-coded default secret if `AI_API_KEY` was unset: `"674930"` or `"your_secret_token"`.
- `quizzes.py` and `ai_tutor.py` also built their own NVIDIA clients, with an invalid default model ID `z-ai/glm-5-3-flash` (the catalog ID is `z-ai/glm-5.3-flash`).

### Implementation

- `dependencies.verify_token`:
  - Accepts `Authorization: Bearer <key>` **or** `X-API-Key: <key>`.
  - Compares with `hmac.compare_digest` (constant time).
  - Returns 401 on failure.
  - Works both as a FastAPI dependency and as a direct call `verify_token(authorization)`.
- `AI_API_KEY` is now **required**. The app raises `RuntimeError("AI_API_KEY is not configured")` at import, like the existing NVIDIA checks.
- All routers import the shared check (as `verify_api_key` where they used that name). Their local `API_KEY`/`APIKeyHeader`/`verify_api_key` definitions were removed.
- `quizzes.py` and `ai_tutor.py` now use the shared `client` and `NVIDIA_MODEL` from `dependencies.py`.

### Files changed (repository `gleamlearn-ai-service`)

- Modified:
  - `dependencies.py`
  - `routers/ai_tutor.py`
  - `routers/personal_ai.py`
  - `routers/personal_ai_companion.py`
  - `routers/quizzes.py`
  - `routers/recommendations.py`
  - `routers/voice_ai.py`
  - `routers/youtube.py`
- New: `tests/__init__.py`, `tests/_env.py`, `tests/test_auth.py`, `tests/test_startup_config.py`

### API compatibility

- Paths and payloads are unchanged.
- Auth differences:
  - Both header styles are accepted on the dependency-based routes.
  - On routes that call `verify_token(authorization)` directly (`documents.py`, `quizzes.py`), only the Bearer header is read. The backend sends it, so this is unchanged behaviour.
  - Invalid-key responses on the former `X-API-Key` routes are now **401** instead of 403. Only the backend calls this service, and it doesn't branch on 401 vs 403.

### Database impact

None (the AI service has no database).

### Configuration

- `AI_API_KEY` is **required** in the AI service. If it's missing, the service won't start, so check Render before deploying. It must equal the backend's `AI_API_KEY`.
- The `NVIDIA_MODEL` default in the tutor and quiz routers was removed; `NVIDIA_MODEL` was already required by `dependencies.py`.

### Testing and verification

| Command (run in `gleamlearn-ai-service`) | Result |
|---|---|
| `python -B -m unittest discover -s tests -t .` | ✅ 6 tests passed: Bearer accepted on both route families; X-API-Key accepted; missing or wrong key → 401; old defaults `674930` and `your_secret_token` → 401; `/` public; startup fails without `AI_API_KEY` |
| AST syntax check of all modules | ✅ |

Tests use stdlib `unittest` with dummy environment values, so no new test dependency is needed and no real credentials are read.

### Outstanding issues and risks / manual actions

- **Manual:** the local `.env` files of the two projects contain **different** `AI_API_KEY` values (found in the audit). Set the same value in both local `.env` files, and in both Render services' environment settings. Values are not recorded here.
- The production key configuration on Render has not been checked; it isn't visible from this machine.

---

## Batch 4: Non-blocking provider calls, timeouts and bounded retries in the AI service (C5)

**Status:** ✅ Verified with offline tests (provider mocked). 🟡 Real NVIDIA latency and timeout behaviour not exercised (paid inference not run).

### Problem

- Every router called the **synchronous** OpenAI SDK client inside `async def` handlers. One slow generation blocked the event loop, so all other requests on that worker stalled.
- The SDK defaults applied: about a 10-minute timeout and 2 automatic retries. A failing call could be billed up to three times and hold the request for a long time.
- `generate_ai_response` was copy-pasted into 10 routers.

### Implementation

- `dependencies.client` is now `AsyncOpenAI` with:
  - `timeout = NVIDIA_TIMEOUT_SECONDS` (default 90 s)
  - `max_retries = NVIDIA_MAX_RETRIES` (default 1; `0` disables retries)
- New shared `async generate_ai_response(system_prompt, user_prompt, require_content=False)`:
  - Provider error → 502, same detail text as before.
  - `require_content=True` → 502 on an empty reply.
- Local helper copies were removed. Every call site now uses `await`.
- `tests.py` and `exams.py` keep their `generate_test_with_ai`/`generate_exam_with_ai` wrappers and system prompts, now async.
- `voice_ai.py` and `youtube.py` keep their previous "empty reply → 502" behaviour through small local wrappers. The other routers keep returning `""` for an empty reply, as before.

### Files changed (repository `gleamlearn-ai-service`)

- Modified:
  - `dependencies.py`
  - `routers/ai_tutor.py`
  - `routers/documents.py`
  - `routers/exams.py`
  - `routers/personal_ai.py`
  - `routers/personal_ai_companion.py`
  - `routers/quizzes.py`
  - `routers/recommendations.py`
  - `routers/tests.py`
  - `routers/voice_ai.py`
  - `routers/youtube.py`
- New: `tests/test_generation.py`

### API compatibility

Paths, request schemas, prompts and response shapes are unchanged. The only behavioural difference is that slow provider calls now fail with 502 after the timeout instead of hanging.

### Database impact

None.

### Configuration

New, optional: `NVIDIA_TIMEOUT_SECONDS` (default `90`), `NVIDIA_MAX_RETRIES` (default `1`).

### Testing and verification

| Command | Result |
|---|---|
| `python -B -m unittest discover -s tests -t .` | ✅ (included in the 24-test run below). Covers: client is `AsyncOpenAI`, timeout ≤ 120 s, retries ≤ 1; model text returned; JSON wrapper parsing; empty reply → 502 only where it was before; provider error → 502 |

### Outstanding issues and risks

- The backend timeout (`AI_HTTP_TIMEOUT_MS`, 120 s) is longer than the provider timeout (90 s) plus one retry only in the common case. Under a Render cold start (about 35 s observed) plus a slow retry, the backend can time out first. Tune both after measuring real latency.
- `max_tokens` is still not set (cost item, Phase 4).

---

## Batch 5: PDF and DOCX text extraction (C1)

**Status:** ✅ Verified with offline tests using generated PDF and DOCX fixtures. 🟡 Not verified against real Cloudinary-hosted files.

### Problem

`fetch_document_text` returned `response.text[:15000]`. For a PDF that is the raw binary decoded as text, so the model received noise and every document feature produced meaningless output.

### Implementation

- `fetch_document_text` is now `async`. The blocking download and parsing run in `asyncio.to_thread`.
- Download: streamed, with a `DOCUMENT_FETCH_TIMEOUT_SECONDS` timeout (default 30) and a `MAX_DOCUMENT_BYTES` size cap (default 25 MB, otherwise 413).
- New `extract_document_text(data, content_type, url)`:

  | Input | Detection | Handling |
  |---|---|---|
  | PDF | `%PDF` signature, `application/pdf`, or a `.pdf` URL | `pypdf`. Tries an empty password for "encrypted" PDFs. Stops reading pages once 15,000 characters are collected. No extractable text (scanned PDF) → 422 with a clear message. |
  | DOCX | Content type, `.docx`, or zip signature | Text from `word/document.xml` (stdlib only) |
  | Text, JSON, `.txt`, `.md` | Content type or extension | Decoded as UTF-8 |
  | Anything else, or binary data in a text response | — | 415 |

- The 15,000-character limit sent to the model is unchanged.
- `routers/quizzes.py` had its own copy of the old fetcher; it now uses the shared one.

### Files changed (repository `gleamlearn-ai-service`)

- Modified:
  - `dependencies.py`
  - `routers/documents.py`
  - `routers/tests.py`
  - `routers/exams.py`
  - `routers/quizzes.py`
  - `requirements.txt` (added `pypdf>=6.20,<7`, and fixed the missing trailing newline)
- New: `tests/test_document_extraction.py`

### API compatibility

Paths and payloads are unchanged. New error statuses replace "success with garbage output":

- 413: file too large
- 415: unsupported type
- 422: unreadable file, or no text found

### Database impact

None.

### Configuration

- New, optional: `MAX_DOCUMENT_BYTES`, `DOCUMENT_FETCH_TIMEOUT_SECONDS`.
- New dependency: `pypdf` (pure Python, free). Render installs it from `requirements.txt` on the next build. It was installed locally (`pypdf 6.20.0`) into the global Python 3.13, because the project has no virtual environment.

### Testing and verification

| Command | Result |
|---|---|
| `python -B -m unittest discover -s tests -t .` | ✅ (included in the 24-test run below). Covers: PDF text extracted, no `%PDF` bytes in the output; PDF detected by signature despite a generic content type; DOCX paragraphs; text truncation; empty PDF → 422; PNG → 415; end-to-end route with the HTTP download and the model mocked (extracted PDF text reaches the prompt); oversize download → 413 |

### Outstanding issues and risks

- **Cloudinary delivery of PDFs:** some Cloudinary accounts block PDF delivery by default (the "Allow delivery of PDF and ZIP files" security setting). If it's enabled on this account, fetches return 401, surfaced as 400 "Failed to fetch document content". Not verified. Check that setting in the Cloudinary console.
- Scanned or image-only PDFs need OCR, which is not implemented.
- The fetcher still accepts any URL (SSRF risk, audit C8, not in this batch's scope). The backend only sends the stored Cloudinary URL, but the AI service doesn't enforce that.
- Only the first ~15,000 characters reach the model (unchanged). Sending only the relevant sections belongs to Phase 4.

---

## Batch 6: YouTube transcript handling (C2, D4)

**Status:** ✅ Verified with offline tests (transcript library, HTTP client and model mocked). 🟡 Not tested against live YouTube; transcript availability depends on YouTube and on server IP restrictions.

### Problem

- **C2:** The AI service called `YouTubeTranscriptApi.get_transcript`, which doesn't exist in the installed `youtube-transcript-api` 1.2.4 (verified). Every `/process` and `/reprocess` returned 400.
- **D4:** The backend fetched the transcript with the npm `youtube-transcript` package, then sent only the URL. The AI service fetched it again, and failed. If the backend's own fetch failed, processing was aborted before the AI service was tried.

### Implementation

- **AI service:**
  - Uses the v1 API: `YouTubeTranscriptApi().fetch(video_id, languages=["en"])`. Falls back to the first available language when no English transcript exists.
  - `YouTubeResourcePayload` gained an optional `transcript` field (additive). When present, it is used directly, capped at 30,000 characters as before, so YouTube isn't hit twice.
  - The fetch runs in a worker thread.
- **Backend:**
  - New `fetchTranscriptText()` returns `''` on failure instead of throwing.
  - `processYoutubeResource` sends `{ url, transcript }` when it has a transcript, and `{ url }` otherwise, so the AI service fetches as a fallback.
  - `rawTranscript` is still stored when the backend obtains it.

### Files changed

- Backend:
  - Modified: `src/youtube/youtube.service.ts`
  - New: `src/youtube/youtube.service.spec.ts`
- AI service:
  - Modified: `routers/youtube.py`, `requirements.txt` (pinned `youtube-transcript-api>=1.0,<2`)
  - New: `tests/test_youtube.py`

### API compatibility

- Public backend routes and responses are unchanged.
- Internal AI request: `transcript` is an optional, additive field.
- Behaviour change: a backend-side transcript failure no longer marks the resource `FAILED` immediately. It fails only if the AI service also can't get a transcript.

### Database impact

None to the schema. Writes the same `youtube` columns as before (`rawTranscript`, `status`, `structuredMaterial`, `processingError`).

### Configuration

None.

### Testing and verification

| Command | Result |
|---|---|
| `npx vitest run src/youtube …` | ✅ 3 tests: backend transcript forwarded; fallback without transcript; `FAILED` status on AI error |
| `python -B -m unittest discover -s tests -t .` | ✅ (included in the 24-test run below). Covers: v1 `fetch` called with `languages=["en"]`; fallback language; supplied transcript used without refetch; missing transcript fetched by the AI service |

### Outstanding issues and risks

- YouTube often blocks transcript requests from cloud IPs, including Render. Live behaviour from Render is unverified and may need a proxy or the official YouTube Data API captions endpoint (which requires OAuth for most videos).
- Ownership checks on YouTube resources are still missing (B4, Phase 2).

---

## Batch 7: Global request validation (B5)

**Status:** ✅ Verified with HTTP-level tests against real project DTOs. 🟡 Frontend payloads could not be inspected (the frontend isn't in either repository), so compatibility was assessed from the backend code only.

### Problem

`main.ts` registered no `ValidationPipe`, so none of the `class-validator` rules on DTOs ran:

- Required fields, types and enums were not enforced.
- Query DTO conversions (`@Type(() => Number)`) and defaults (`page = 1`) never applied.

### Compatibility analysis performed

- Scanned every DTO under `src/**/dto`:
  - All query DTOs already use `@Type(() => Number)` for numeric fields, so they were designed for `transform: true`.
  - The only primitive numeric route params (`@Query('year')`, `@Query('month')` in `calendar.controller.ts`) convert safely. There are no boolean primitive params.
- **`whitelist: true` would break existing behaviour.** `AuthService.changePassword` reads `confirmNewPassword`, which `ChangePasswordDto` doesn't declare. Stripping it would make every password change fail with "New passwords do not match". `UpdateUserDto` (`src/auth/dto/password.dto.ts`) has no validators, so all of its fields would be stripped.
- `@Body() body: any` handlers (23 of them) are not affected; the pipe skips untyped bodies.

### Implementation

- `createGlobalValidationPipe()` uses: `transform: true`, `whitelist: false`, `forbidNonWhitelisted: false`, `forbidUnknownValues: false`, and error output without echoing submitted values or targets.
- Registered in `main.ts` unless `REQUEST_VALIDATION=off`, which is a rollback switch that needs no code change.

### Files changed

- New: `src/common/validation/global-validation.pipe.ts`, `src/common/validation/global-validation.pipe.spec.ts`
- Modified: `src/main.ts`

### API compatibility

- Paths and response bodies are unchanged.
- **Intentional behaviour change:** requests that violate a declared validator now get **400** with field messages instead of reaching the service. Examples: a missing required field, a wrong type, an out-of-range `page`. Clients that send invalid payloads will start seeing 400s.
- Undeclared extra fields are still accepted and passed through.

### Database impact

None directly. Indirectly, invalid payloads are now rejected before any write.

### Configuration

New, optional: `REQUEST_VALIDATION` (`on` by default; `off` disables the pipe).

### Testing and verification

| Command | Result |
|---|---|
| `npx vitest run src/common` | ✅ 8 tests (6 for the pipe): invalid `ChangePasswordDto` → 400 without echoing the password; `confirmNewPassword` preserved; `TutorActionDto` requires `input`; `AdminUsersQueryDto` `page=2` → number 2 with default `limit=10`, and `page=0` → 400; `any` body untouched; kill switch |

### Outstanding issues and risks

- Watch for new 400s after deploy. If the frontend breaks, set `REQUEST_VALIDATION=off` on Render and report the failing payload.
- **New security finding (not fixed, needs a decision):** `PATCH /auth/me` (`AuthService.updateMe`) runs `Object.assign(user, body)`. Any authenticated user can set arbitrary `users` columns on their own record, including `passwordHash`, `isEmailVerified`, `isRestricted` and `refreshToken`. Turning on `whitelist` would also neuter this endpoint (its DTO has no validators), so the fix belongs in the service: allow-list the fields. Proposed for Phase 2.

---

## Phase 1 summary (2026-10-11)

| ID | Item | Status |
|---|---|---|
| B1 | `synchronize` opt-in via `DB_SYNCHRONIZE` | ✅ Verified (type-check). Not booted against a DB. |
| B3 | Real quiz grading + once-per-quiz rewards | ✅ Verified (unit) |
| D1, D2 | AI document paths + `{fileId, fileUrl, options}` payload | ✅ Verified (unit, mocked HTTP) |
| D3, C3 | Unified internal auth, no hard-coded secrets, fail-fast `AI_API_KEY` | ✅ Verified (unit). 🟡 Needs matching keys configured manually. |
| C1 | PDF/DOCX extraction | ✅ Verified (unit, generated fixtures) |
| C2, D4 | YouTube v1 transcript API + transcript reuse | ✅ Verified (unit, mocked) |
| C5, B13 | Async client, timeouts, bounded retries | ✅ Verified (unit, mocked) |
| B5 | Global `ValidationPipe` (non-stripping) | ✅ Verified (HTTP tests against real DTOs) |

**Final verification commands**

| Command | Result |
|---|---|
| Backend `npx tsc --noEmit -p tsconfig.build.json` | ✅ exit 0 |
| Backend `npx vitest run` | 25 passed, **4 failed**. The 4 failures are the **pre-existing** "should be defined" specs in `src/auth/*.spec.ts` and `src/users/*.spec.ts`, which lack provider mocks; they failed identically during the audit, before any change. All 24 new tests pass (5 old + 24 new = 29 total). |
| Backend `npx oxlint` on changed paths | No new findings (one pre-existing unused-import warning in `src/ai/ai.controller.ts`) |
| AI service `python -B -m unittest discover -s tests -t .` | ✅ 24 tests passed |

**Not run, by design:**
- `npm run build`: it runs `prisma contract emit`, which may regenerate tracked Prisma files.
- Booting the backend: it connects to the configured database, and the startup path may seed records.
- Any live NVIDIA or YouTube calls.

**Manual actions required**

1. Set the **same** `AI_API_KEY` in the backend and AI service, in both local `.env` files and both Render services. The AI service now refuses to start without it.
2. Leave `DB_SYNCHRONIZE` unset (or `false`) on Render. Set `true` only deliberately, against a disposable or local database.
3. For local development, set `AI_SERVICE_URL=http://127.0.0.1:8000` in the backend `.env`. It currently points at the production AI service.
4. Check the Cloudinary "Allow delivery of PDF and ZIP files" setting (Batch 5 risk).
5. Redeploy the AI service so Render installs `pypdf` and the pinned `youtube-transcript-api`. The deploy order between the backend and the AI service doesn't matter (the backend sends both auth headers).

---

# Phase 2: Security corrections

**Frontend evidence used:** `C:\Users\USER\Desktop\gleamlearn-landing` (git remote `Hilosthone/gleamlearn`).

- Its `src/lib/api.ts` defines the client contract: base URL `…/api/v1`, payload types, and error handling `throw new Error(data?.message || data?.error || …)`.
- As of 2026-10-11 **no page imports `src/lib/api.ts`**. The dashboard pages are UI-only, so no live frontend workflow calls these endpoints yet.
- Compatibility was therefore checked against the declared client types and the `{ statusCode, message }` error shape it reads.

## Batch 8: `PATCH /auth/me` mass assignment, plus the same flaw in `PATCH /users/me*`

**Status:** ✅ Verified by unit tests (repositories mocked). Not exercised against a real database.

### Problem

- `AuthService.updateMe` ran `Object.assign(user, body)` and saved it. Any authenticated user could set any column on their own `users` row: `passwordHash`, `isEmailVerified`, `isRestricted`, `restrictionReason`, `refreshToken`, `verificationOtp` and `otpExpiresAt`.
- The same flaw existed in `UsersService.updateProfile`, `updateAcademicProfile` and `updatePreferences` (`userRepository.update(userId, dto)`). The global pipe from Batch 7 does not strip extra fields, so it did not prevent this.
- Fixing those three methods was included because they are the same approved vulnerability class ("never allow profile endpoints to update protected fields").

### Implementation

- New `src/common/utils/profile-update.util.ts`:
  - `pickAllowed(source, allowedKeys)` copies only listed keys.
  - Allowlists:
    - `BASIC_PROFILE_FIELDS` = `fullName`, `username`, `dateOfBirth`, `country`. This matches the frontend `UpdateProfilePayload` and `UpdateBasicUserPayload`, minus `email`.
    - `ACADEMIC_PROFILE_FIELDS` = the `UpdateAcademicProfileDto` and frontend `AcademicProfilePayload` fields.
    - `PREFERENCE_FIELDS` = `preferredLearningPace`, `preferredStudyTime`.
  - `buildBasicProfileUpdate(body, currentEmail)`:
    - Applies the basic allowlist.
    - Maps the legacy `name` field (documented on the old auth DTO) to `fullName`.
    - **Email:** the same email (case-insensitive) is ignored. A different email → **400** `"Email address cannot be changed from the profile. Email changes require verification of the new address."` No email-change endpoint exists. There is only an unused mail template, `sendEmailChangeRequestEmail`, and building the flow needs new columns, so it is proposed, not built.
- `AuthService.updateMe` assigns only `buildBasicProfileUpdate(...)`.
- `UsersService.updateProfile`, `updateAcademicProfile` and `updatePreferences` write only allowlisted fields, and skip the DB call when nothing allowed remains.
- `src/auth/dto/password.dto.ts` `UpdateUserDto` now declares and validates `name`, `fullName`, `username`, `dateOfBirth`, `country` and `email` (all optional).
- **Password changes** stay on `POST /auth/change-password`. `passwordHash` can't be set through any profile route.

### Files changed

- New: `src/common/utils/profile-update.util.ts`, `src/common/utils/profile-update.util.spec.ts`
- Modified: `src/auth/auth.service.ts`, `src/users/users.service.ts`, `src/auth/dto/password.dto.ts`

### API compatibility

- Paths and success response shapes are unchanged.
- Allowed fields still update as before.
- Protected or unknown fields are now **silently ignored** instead of written.
- Behaviour change: sending a **different** `email` returns 400. Before, it changed the login email with no verification. The frontend client type includes `email`, but no page calls it yet.

### Database impact

- No schema change and no migration.
- Existing records are untouched. Future requests can no longer modify protected columns through these routes.

### Configuration

None.

### Testing and verification

| Command | Result |
|---|---|
| `npx vitest run src/common/utils` | ✅ 8 tests |

What the 8 tests cover:
- The allowlist alone drops: `passwordHash`, `isEmailVerified`, `isRestricted`, `restrictionReason`, `refreshToken`, `verificationOtp`, `otpExpiresAt`, `role`, `isFrozen`, `deletedAt`, `id`.
- `name` maps to `fullName`.
- Unchanged email is ignored; a changed email is rejected.
- `updateMe` writes `fullName` but leaves `passwordHash`, `isEmailVerified`, `isRestricted` and `id` as stored, and the response omits `passwordHash`.
- Email change rejected with no save.
- `/users/me`, academic profile and preferences write only allowed fields.
- An update with only disallowed fields performs no write.

### Outstanding issues and risks

- **Existing bug (not changed):** `AuthService.changePassword` requires `confirmNewPassword` to equal `newPassword`. The frontend `ChangePasswordPayload` sends only `oldPassword` and `newPassword`, so password change from that client would always fail with "New passwords do not match". Needs a decision: either make `confirmNewPassword` optional or have the frontend send it.
- **B2-related (not changed):** `UsersService` uses the `auth/entities/user.entity.ts` entity. Several academic and preference fields the DTO accepts (`levelOrClass`, `preferredLearningPace`) don't exist on that entity (it has `level`), so TypeORM may reject those updates. Documented for the Phase 3 B2 analysis.
- Username uniqueness errors still surface as a generic 500 (pre-existing).

---

## Batch 9: Safe, consistent AI error handling (B9)

**Status:** ✅ Verified by unit tests (HTTP client and repositories mocked).

### Problem

- Document, quiz, test and exam services forwarded the AI service's raw `detail` and status. Clients could see provider internals (`"NVIDIA AI generation failed: <provider error>"`), library exception text and URLs, and an internal 401 reached users as 401.
- Tutor, voice and recommendations threw plain `Error`, so every AI failure, including timeouts and rate limits, became a 500.
- **Failures reported as success:**
  - `PersonalAiService.chat` saved `"[Offline Mode] Python AI Service received your message: …"` as a real AI message and returned `status: 'success'`.
  - `PersonalAiService` tools (explain, summarize, example, practice, evaluate, explain-mistake) returned `{ status: 'success', fallback: true, … }` on failure.
  - `AiTutorService.proxyToPython` returned `'AI Tutor processed your request.'` on an empty AI reply.
- Tutor and personal chat saved the user's message **before** calling the AI, so a failure left unanswered messages.
- YouTube stored the raw upstream detail in `processingError` (returned by the status endpoint) and always returned 500.

### Implementation

- New `toAiHttpException(error, operation)` in `src/common/ai-service/ai-error.ts`. Responses keep the standard Nest body `{ statusCode, message }`, which the frontend reads.

  | Upstream result | Returned to client |
  |---|---|
  | 400/404/413/415/422 with a **known safe** message authored by the AI service | Same status, same message. 16 messages, each verified to exist word for word in the AI service source. |
  | "Failed to fetch document content…" | 400 "The document could not be downloaded for processing." |
  | "Failed to retrieve YouTube transcript…" | 400 "A transcript could not be retrieved for this video." |
  | 404 (other) | 404 generic |
  | 429 | 429 "The AI service is busy…" |
  | 401/403 (internal key misconfiguration), 422 schema errors, 5xx provider failures | 502 "AI generation failed. Please try again later." |
  | Timeout (`ECONNABORTED`/`ETIMEDOUT`) | 504 |
  | Connection failure | 503 |
  | An existing `HttpException` | Passed through unchanged |

- **Logging:** `Logger('AiServiceClient').warn` records the operation, upstream status, error code, the status returned, and the upstream detail truncated to 300 characters. It never logs request headers, the axios config, request payloads (user content) or credentials.
- Applied in: `ai`, `quizzes`, `tests`, `exams`, `ai-tutor`, `ai-voice`, `recommendations`, `personal-ai`, `youtube`.
- `PersonalAiService.chat`:
  - Checks conversation ownership, calls the AI, and only then creates the conversation (if new) and saves both messages.
  - On AI failure, nothing is persisted and a mapped error is returned. An empty reply → 502.
- `PersonalAiService` tools throw mapped errors; there is no `fallback: true` success any more.
- `AiTutorService.addMessage` calls the AI before saving. An empty reply → 502, with no placeholder text.
- `YoutubeService.processYoutubeResource` stores the safe message in `processingError` and returns `Failed to process YouTube video: <safe message>` with the mapped status. Before, it always returned 500. "No generated material" → 502.

### Files changed

- New: `src/common/ai-service/ai-error.ts`, `src/common/ai-service/ai-error.spec.ts`
- Modified:
  - `src/ai/ai.service.ts`
  - `src/quizzes/quizzes.service.ts`
  - `src/tests/tests.service.ts`
  - `src/exams/exams.service.ts`
  - `src/ai-tutor/ai-tutor.service.ts`
  - `src/ai-voice/ai-voice.service.ts`
  - `src/recommendations/recommendations.service.ts`
  - `src/personal-ai/personal-ai.service.ts`
  - `src/youtube/youtube.service.ts`
- Tests updated for the new intended behaviour: `src/ai/ai.service.spec.ts`, `src/youtube/youtube.service.spec.ts`

### API compatibility

- Success responses are unchanged.
- Error bodies keep `{ statusCode, message }`.
- Status-code changes:
  - Tutor, voice and recommendations failures: 500 → 502/503/504/429.
  - Upstream 401/403 → 502.
  - YouTube processing: 500 → mapped status.
  - Personal-AI chat and tools: **200 with fake content → error status**. This was approved: failures must not be reported as successes.
- Error messages are now generic instead of provider text.

### Database impact

- No schema change.
- Behaviour change: failed AI calls no longer create placeholder AI messages, unanswered user messages, or empty conversations.
- Existing records, including any earlier `[Offline Mode]` messages, are untouched.

### Configuration

None.

### Testing and verification

| Command | Result |
|---|---|
| `npx vitest run src/common src/ai src/youtube src/quizzes` | ✅ 8 files, 49 tests |
| `npx tsc --noEmit -p tsconfig.build.json` | ✅ exit 0 |
| `npx vitest run` (full) | 50 passed, 4 failed. The same 4 pre-existing auth/users "should be defined" failures as before Phase 1. |
| `npx oxlint` on the modified files | No new warnings (one unused import introduced and then removed) |
| Cross-check script: each safe message string exists in the AI service source | ✅ 16/16 found |

The B9-specific tests cover:
- The mapping table above (9 cases).
- HttpException passthrough.
- Log lines contain the status but not `Authorization`/`X-API-Key` values or request payload text.
- Personal chat: AI down → 503 with no conversation or message saved; success path unchanged.
- Personal tools: no fallback success.
- Tutor: timeout → 504 and empty reply → 502, with no messages saved.
- YouTube: a safe `processingError` that doesn't contain provider text.

### Outstanding issues and risks

- The safe-message list must be kept in sync if AI service error texts change. A changed text would degrade to a generic message, not leak.
- The AI service itself still puts `str(e)` in its own `detail` (audit C9). It is now contained at the backend boundary but still visible to anyone calling the AI service directly with the internal key.
- Errors from the optional YouTube Data API metadata fetch inside `processYoutubeResource` are reported as 503 "AI service unavailable". The status is acceptable, but the wording is imprecise.

---

## Phase 2: Proposals awaiting review (⬜ not implemented)

### New critical findings from the configuration audit (2026-10-11)

These were found while auditing configuration for B10. **No credential was changed.** Rotation is the owner's action.

1. **The AI service's internal key is public.**
   - The repository `Hilosthone/gleamlearn-ai-service` is public (checked through the GitHub API).
   - Commit `bb99205` (2026-09-12) contains a `.env` with `AI_API_KEY`. The value in the current local `.env` is **identical** (compared by hash; not printed).
   - Anyone can call the deployed AI service directly and consume NVIDIA credits.
   - Action: rotate `AI_API_KEY` (new value in both services). Removing the file from history does not un-leak it.
2. **The backend repository is public.** `Hilosthone/mycoursea-backend` redirects to the public `Hilosthone/gleamlearn-backend`. That exposes the hard-coded fallbacks in the source:
   - `JWT_SECRET` fallbacks in `src/auth/auth.module.ts`, `src/auth/strategies/jwt.strategy.ts`, `src/admin/auth/admin.module.ts` and `src/admin/auth/strategies/admin-jwt.strategy.ts`. If a deployment ever ran without `JWT_SECRET`, anyone could forge user **and admin** tokens.
   - A default super-admin email and password in `AdminAuthService.onModuleInit` (`src/admin/auth/admin-auth.service.ts`). The app **seeds a Super Admin at startup** with the default password if `SUPER_ADMIN_PASSWORD` is unset.
   - Action: confirm on Render that `JWT_SECRET`, `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` were always set. If unsure, rotate `JWT_SECRET` (all sessions are logged out) and change the super-admin password.
3. Git history of the backend contains no `.env` file (checked).

### B4: Ownership (proposal)

**YouTube** (ready to implement; no schema change)
- `youtube.userId` is `NOT NULL`, so every row already has an owner and no access is lost.
- Change `findById`, `deleteResource`, `getStatus`, `processYoutubeResource` and `reprocessYoutubeResource` to look up by `{ id, userId }`, passing `@CurrentUser` from `src/youtube/youtube.controller.ts`.
- Non-owners get **404** (not 403), so IDs can't be probed.
- Files: `src/youtube/youtube.service.ts`, `src/youtube/youtube.controller.ts` and the spec.

**Files** (needs a migration)
- Investigation results:
  - `files` has no uploader column, and nothing in the schema links files to users. The only reference is `ai_generated_contents.fileId`, which is never written. Library favorites use a generic `referenceId`, and activity and audit logs don't record uploads.
  - Ownership of existing rows **cannot be inferred**.
  - The upload handler also drops the `category` field (there is no column for it).
  - Cloudinary `secure_url`s are public URLs: anyone holding a URL can download the file regardless of API checks.
- Proposed migration: `docs/migrations/proposed/2026-10-11_B4_files_add_userId.sql`. Additive: a nullable `userId` plus an index. It must run **before** the code deploy.
- Proposed behaviour:
  - New uploads record `userId`.
  - Owners can list, read, process, delete and generate AI content from their files.
  - Other users get 404.
  - AI document endpoints use the owner-scoped lookup.
- **Legacy rows (`userId IS NULL`), reconciliation choice:**
  - **(A) Transitional shared (recommended default):** legacy files stay readable by authenticated users, as today, but become **read-only**: no delete or reprocess by users. A config flag `LEGACY_FILES_ACCESS=shared|hidden` later switches them off without a code change. No one loses access on deploy.
  - **(B) Hidden:** legacy files are not visible to users. This is only appropriate if the pre-check count shows they are test data.
  - Assigning owners: there is no data to do it automatically. A later, approved one-off SQL `UPDATE` can assign known files by ID.

### B6: Quiz, test and exam permissions (proposal)

- **Evidence:**
  - The frontend client (`gleamlearn-landing/src/lib/api.ts`) exposes student-facing `POST/PATCH/DELETE /quizzes|/tests|/exams` ("Create a new quiz manually"). Students are intended to create their own assessments.
  - `users.role` exists (default `'student'`), but no code checks it, and `JwtStrategy` reads the auth entity, which lacks `role` (B2). **There is no teacher role.**
  - Admins are a separate `admins` table with `admin-jwt` tokens.
  - `quizzes`, `tests` and `exams` have no creator column.
- **Proposed authorization matrix:**

  | Operation | Student (creator) | Other student | Legacy row (creator unknown) | Admin (admin JWT) |
  |---|---|---|---|---|
  | List / get | ✅ own + legacy/platform | ✅ legacy/platform only | ✅ readable by all | ✅ (future admin endpoints) |
  | Create | ✅ (sets `createdBy`) | — | — | ✅ |
  | Update / delete | ✅ | ❌ 404 | ❌ for users (read-only) | ✅ |
  | Start / submit / results | ✅ | ✅ on readable rows | ✅ | — |
  | AI generate (`/generate*`) | ✅ (quota in Phase 4) | ✅ | n/a | ✅ |
  | Teacher | No teacher role exists; out of scope until one is designed | | | |

- Migration: `docs/migrations/proposed/2026-10-11_B6_assessments_add_createdBy.sql`. Additive and nullable.
- Files: entities, services and controllers for `quizzes`, `tests` and `exams`, plus specs.
- Open question for the owner: should `GET /quizzes` list **all** students' quizzes (as today) or only own + platform ones? The table assumes own + platform.

### B10: Configuration validation (proposal and checklist)

**Inventory** (from `process.env.*`, `ConfigService.get(...)` and `os.getenv(...)`):

| Variable | Service | Used for | Proposed rule |
|---|---|---|---|
| `JWT_SECRET` | backend | user and admin token signing and verification | **Required**, ≥ 32 characters; remove the 4 fallback secrets → **backend won't start without it** |
| `JWT_EXPIRES_IN` | backend | token lifetime | Optional (default `7d`) |
| `DATABASE_URL` | backend | Prisma modules (calendar, reports, search, subscriptions, usage); TypeORM only if it contains `supabase.co` | **Required in production** |
| `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME` | backend | TypeORM when `DATABASE_URL` isn't Supabase | **Required in production** (no `postgres`/`postgres` defaults); defaults kept for local development |
| `AI_SERVICE_URL` | backend | AI calls | **Required in production** (local default `http://127.0.0.1:8000`) |
| `AI_API_KEY` | backend + AI service | internal auth | **Required in both**. The AI service already fails without it (Batch 3) → both services won't start without it |
| `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD` | backend | startup Super Admin seeding | Remove the defaults. If either is unset, **skip seeding with a warning** (don't fail startup, so an already-seeded deployment keeps working) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | backend | uploads | Warn at startup if missing (uploads fail) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | backend | OTP and verification email | Warn if missing (signup verification fails) |
| `FRONTEND_URL` | backend | links in emails | Optional (existing default) |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | backend | push notifications | Optional; warn |
| `YOUTUBE_API_KEY`, `ALOC_API_KEY`, `ALOC_BASE_URL` | backend | video metadata, past questions | Optional; warn |
| `PORT` | backend | listen port | Optional (Render sets it) |
| `NODE_ENV` | backend | production detection | **Set `production` on Render** (currently unset) |
| `DB_SYNCHRONIZE`, `REQUEST_VALIDATION`, `AI_HTTP_TIMEOUT_MS` | backend | Phase 1 switches | Optional |
| `NVIDIA_API_KEY`, `NVIDIA_MODEL` | AI service | provider | Required (already enforced) → **AI service won't start without them** |
| `NVIDIA_BASE_URL`, `NVIDIA_TIMEOUT_SECONDS`, `NVIDIA_MAX_RETRIES`, `MAX_DOCUMENT_BYTES`, `DOCUMENT_FETCH_TIMEOUT_SECONDS` | AI service | provider, documents | Optional |
| `OPEN_AI_KEY`, `NVIDIA_API_KEY`, `NVIDIA_BASE_URL`, `CLOUDINARY_API_ENVIROMENT` in the **backend** `.env` | backend | not read by active code | Can be removed from the backend environment |
| `OPENAI_API_KEY` | README only | not read | Update the README |

**Proposed implementation:**
- A `validate` function on `ConfigModule.forRoot` (`src/config/env.validation.ts`). It names each missing variable and never prints values.
- Remove the JWT fallbacks in the 4 files.
- Change super-admin seeding to skip when credentials are unset.
- A startup warning list for the optional integrations.
- Production-only requirements apply when `NODE_ENV=production`.

---

# Phase 2 (continued)

## Batch 10: Credential-exposure remediation checklist (P0)

**Status:** ✅ Document prepared. ⬜ No rotation, environment change, history rewrite or deployment performed; all are owner actions.

- **Deliverable:** `docs/SECURITY_REMEDIATION_CHECKLIST.md`. It covers NVIDIA key rotation, `AI_API_KEY` rotation in both services, `JWT_SECRET` verification and replacement (with its session impact), super-admin password replacement (through the existing admin forgot/reset flow), verification of other Render variables, prevention of future commits, and history cleanup as a separate, backed-up and coordinated operation.
- **History scan:** all commits of both repositories, file paths only (no values printed).
  - Confirmed exposure: `.env` with `AI_API_KEY` in AI-service commit `bb99205`.
  - Not found: NVIDIA keys, database, Cloudinary, SMTP or Firebase secrets, private keys, connection strings.
  - The backend history contains no `.env`.
  - No `.env` is currently tracked in either repository. The `sk-` hit in `package-lock.json` is an integrity hash (false positive).
- **New finding:** `AuthService.refreshToken` is a stub that returns a placeholder token, so sessions are the access JWTs alone. Rotating `JWT_SECRET` therefore logs out every user and admin, with no database change.
- **Files changed:** `docs/SECURITY_REMEDIATION_CHECKLIST.md` (new). No code changes.
- **API, database and configuration impact:** none from this batch.

## Batch 11: YouTube resource ownership (B4, YouTube part)

**Status:** ✅ Verified by unit tests (repository mocked with an in-memory store that applies the `{ id, userId }` filter).

- **Problem:** `GET /youtube/:id`, `DELETE /youtube/:id`, `GET /youtube/:id/status`, `POST /youtube/:id/process` and `POST /youtube/:id/reprocess` looked resources up by ID only. Any authenticated user could read another user's transcript and generated material, delete it, or trigger paid AI processing on it. `GET /youtube` and `POST /youtube` were already scoped to the user.
- **Implementation:**
  - `YoutubeService.findById(id, userId)` queries `{ id, userId }`.
  - Another user's resource, a nonexistent ID, a malformed (non-UUID) ID and a missing user all produce the **same** `404 "YouTube resource not found"`, so nothing about other users' data is disclosed. Malformed IDs no longer reach Postgres; before, they could raise a uuid cast error, which surfaced as a 500.
  - `deleteResource`, `getStatus`, `processYoutubeResource` and `reprocessYoutubeResource` take `userId`.
  - The controller passes `req.user.id || req.user.sub`, the same expression its existing create and list routes use.
- **Files changed:** `src/youtube/youtube.service.ts`, `src/youtube/youtube.controller.ts`, `src/youtube/youtube.service.spec.ts`
- **API compatibility:**
  - Paths, request bodies and success responses are unchanged.
  - The owner's workflow is unchanged.
  - Non-owners now get 404 instead of the resource. This matches the frontend client's `/youtube` routes in `gleamlearn-landing/src/lib/api.ts`.
- **Database impact:** none. `youtube.userId` already exists and is `NOT NULL`, so every existing row has an owner and no legitimate access is lost. No migration.
- **Configuration:** none.
- **Testing:**

  | Command | Result |
  |---|---|
  | `npx vitest run src/youtube` | ✅ 12 tests |
  | Full `npx vitest run` | 58 passed, 4 failed (the same 4 pre-existing auth/users failures) |
  | `npx tsc --noEmit -p tsconfig.build.json` | ✅ |
  | `npx oxlint src/youtube` | No warnings |

  The 12 tests cover:
  - The owner can read, check status and delete.
  - For each of the 5 per-resource operations, another user gets an identical 404 with no save, no delete, no AI call and no status change.
  - Malformed IDs and a missing user → 404 with no query.
  - The list contains only the requester's resources.
  - The 4 earlier transcript and error tests, now with the owner passed.
- **Outstanding:** none for YouTube.

## Batch 12: Uploaded-file ownership and B6 authorization (design and migrations for review)

**Status:** ⬜ Design only. No code, migration or deployment.

- **Deliverable:** `docs/proposals/B4_B6_OWNERSHIP_DESIGN.md`. It supersedes the shorter B4 and B6 proposals earlier in this changelog.
- **Migrations reviewed (still not executed):**
  - `docs/migrations/proposed/2026-10-11_B4_files_add_userId.sql`
  - `docs/migrations/proposed/2026-10-11_B6_assessments_add_createdBy.sql`

  Both are additive, nullable, indexed, transactional and idempotent, and come with rollback scripts. They must run **before** the code that declares the columns.
- **Key design decision:** `LEGACY_FILES_ACCESS` and `LEGACY_ASSESSMENTS_ACCESS` are **fail-closed**.
  - Unset, empty or invalid → `hidden`.
  - Option A requires setting `shared-readonly` **explicitly**.
  - The flags affect only rows with an unknown owner, and never grant write access. Owned rows are always owner-only.
- **Read-only evidence:**
  - Local development database (inside a `READ ONLY` transaction): `files` 0, `quizzes` 0, `tests` 0, `exams` 0, `youtube_resources` 2, `admins` 1. No owner columns.
  - **Production counts are unknown.** The pre-check queries are in each SQL file.
- **Pre-existing defects found (fixes proposed in the design):**
  1. Static routes (`/quizzes/attempts`, `/tests/attempts`, `/exams/history`) are shadowed by `@Get(':id')`.
  2. `generate-from-document` on quizzes, tests and exams forwards a client-supplied `fileUrl`, bypassing file ownership and enabling arbitrary URL fetches by the AI service.
- **Files changed:** `docs/proposals/B4_B6_OWNERSHIP_DESIGN.md` (new).

## Batch 13: Password-change confirmation (backend)

**Status:** ✅ Backend verified by unit and HTTP tests. ⬜ Frontend contract update **not applied**: the `gleamlearn-landing` directory is outside this session's permitted working directories (`blockReadsOutsideWorkingDirectories`), and the setting was not bypassed.

- **Problem:**
  - `AuthService.changePassword` requires `confirmNewPassword === newPassword`, but `ChangePasswordDto` didn't declare the field.
  - The frontend `ChangePasswordPayload` (`gleamlearn-landing/src/lib/api.ts`) sends only `oldPassword` and `newPassword`, so every change would fail with "New passwords do not match".
  - Per the owner's decision, the confirmation stays **required**; it was not made optional.
- **Implementation (backend):**
  - `ChangePasswordDto.confirmNewPassword` is declared and required (`@IsNotEmpty`, `@IsString`). Swagger documents it.
  - `changePassword` also rejects missing `oldPassword`, `newPassword` or `confirmNewPassword` with 400 **before** any lookup or hash, so the rule holds even with `REQUEST_VALIDATION=off`. Before this, a missing `newPassword` could reach `bcrypt.hash(undefined)`.
  - The mismatch check, old-password check and notification email are unchanged.
- **Frontend change, prepared but not applied** (`gleamlearn-landing/src/lib/api.ts`, interface `ChangePasswordPayload`): add `confirmNewPassword: string;`. No page calls `authApi.changePassword` yet; the settings page shows only a static "Change Password" item. So this is a type-contract change only, and any future form must send the confirmation field.
- **Files changed:**
  - Modified: `src/auth/dto/password.dto.ts`, `src/auth/auth.service.ts`
  - New: `src/auth/change-password.spec.ts`
- **API compatibility:**
  - `POST /api/v1/auth/change-password` now documents `confirmNewPassword` as required.
  - Its behaviour is unchanged (the field was already functionally required). A request without it now gets a clear validation 400 instead of "New passwords do not match".
- **Database impact:** none.
- **Testing:**

  | Command | Result |
  |---|---|
  | `npx vitest run src/auth/change-password.spec.ts src/common` | ✅ 38 tests |
  | Full `npx vitest run` | 65 passed, 4 failed (the same 4 pre-existing auth/users failures) |
  | `npx tsc --noEmit -p tsconfig.build.json` | ✅ |
  | `oxlint` on the changed files | 0 warnings |

  The 8 new tests cover:
  - Matching passwords → hash changed, saved once, notification sent.
  - A mismatch, a missing confirmation (service level) and a wrong old password → rejected, no save.
  - `PATCH /auth/me` ignores `password`, `newPassword`, `confirmNewPassword` and `passwordHash`.
  - HTTP: a body without `confirmNewPassword` → 400 naming the field; the full payload is accepted.
- **Outstanding:**
  - **Same mismatch in password reset (not changed; outside the approved scope):** `AuthService.resetPassword` requires `confirmNewPassword`, but `ResetPasswordDto` and the frontend `ResetPasswordPayload` (`token`, `newPassword`) lack it, so reset would always fail. The proposed fix mirrors this batch.

---

## Batch 14 (2026-10-12): Backend security corrections, test baseline, configuration and migration evidence

**Scope:** backend repository only. The frontend (`gleamlearn-landing`) and AI service (`gleamlearn-ai-service`) are **not accessible** in this session: `permissions.blockReadsOutsideWorkingDirectories` is set, and it was not bypassed. All work requested for those repositories is pending access.

**Correction to Batch 13:** `src/auth/change-password.spec.ts` contains **7** tests, not 8 as reported.

### 14a. The four failing auth/users specs: pre-existing, now fixed

- **Investigation:** the spec files were untouched by Phases 1–2 (`git diff HEAD` is empty for all four).
- **Proof:** the same specs were run against **unmodified `HEAD` (`9e3ea59`)** in a temporary `git worktree`, with `node_modules` linked through a junction.
  - Result: **4 failed / 1 passed**, with identical errors: `Nest can't resolve dependencies of AuthService (… JwtService …)`, `… "UserRepository" …`, `… JwtAuthGuard (AuthModuleOptions) …`, `… UsersService ("UserRepository") …`.
  - **Verified pre-existing; not regressions.**
  - The worktree and junction were removed afterwards (junction deleted non-recursively; the real `node_modules` was verified intact; `git worktree list` shows only the main tree).
- **Cause:** the default `nest g` scaffold specs never provided mocks for the real constructor dependencies.
- **Fix (test files only):** provide mock providers (`getRepositoryToken(User)` from `auth/entities/user.entity.js`, `JwtService`, `MailService`, `NotificationsService`) and override `JwtAuthGuard` in the controller specs.
- **Files:** `src/auth/auth.controller.spec.ts`, `src/auth/auth.service.spec.ts`, `src/users/users.controller.spec.ts`, `src/users/users.service.spec.ts`

### 14b. Password reset requires confirmation

- `ResetPasswordDto.confirmNewPassword` is now declared and required.
- `AuthService.resetPassword` rejects a missing or blank `token`, `newPassword` or `confirmNewPassword` (and a non-string `token`) with 400 **before** the OTP lookup.
- **Finding, verified against the library source:** the lookup `findOne({ where: { verificationOtp: token } })` with an `undefined` token would match *any* user if `undefined` conditions were ignored. In the installed TypeORM **1.1.1**, `invalidWhereValuesBehavior` defaults to `throw` (`SelectQueryBuilder.buildWhere`), and `app.module.ts` doesn't override it. So today it produced a 500, **not** an account takeover. The guard removes the dependence on that default.
- **Files:** `src/auth/dto/password.dto.ts`, `src/auth/auth.service.ts`; new `src/auth/reset-password.spec.ts`
- **Tests (9):**
  - Success (password re-hashed, OTP cleared, email sent).
  - Mismatch → 400, no lookup.
  - Missing confirmation, missing token, blank token, non-string token → 400 with no lookup.
  - Unknown or expired code → no save.
  - HTTP: missing `confirmNewPassword` → 400 naming the field; the full payload is accepted.
- **Frontend counterpart:** pending repository access (see "Pending: other repositories").

### 14c. Unreachable static routes

- `GET /api/v1/quizzes/attempts`, `/tests/attempts` and `/exams/history` were captured by `GET /:id`, because they were declared after it.
- The three handler blocks were moved above `@Get(':id')`. Handler code, decorators, paths and responses are byte-identical, so there is no contract change.
- **Files:** `src/quizzes/quizzes.controller.ts`, `src/tests/tests.controller.ts`, `src/exams/exams.controller.ts`; new `src/common/routing/static-route-order.spec.ts`
- **Tests (7):** each static route reaches its own handler; `/:id` still reaches `findOne`; the static segment is never passed to `findOne`.
- **Negative control:** with the three controller changes stashed, the spec **fails 4 of 7**. Restored afterwards; the stash list is empty.

### 14d. Arbitrary client `fileUrl` no longer fetched

- **Problem:** `POST /quizzes|tests|exams/generate-from-document` forwarded a client-supplied `fileUrl`. The AI service would download any URL: internal addresses, other users' files, arbitrary hosts.
- **Implementation:**
  - `isTrustedStorageUrl(url)`: only `https://res.cloudinary.com/<CLOUDINARY_CLOUD_NAME>/…`, with no port and no userinfo. If `CLOUDINARY_CLOUD_NAME` is unset, nothing is trusted (fail-closed).
  - `resolveDocumentPayload(payload, loadFile)`:
    - Requires `fileId` (or the legacy `documentId`). URL-only requests → 400 "fileId is required…".
    - Loads the stored file through an access-check function. Today that is `FilesService.findFileById`; after the approved B4 migration it becomes the owner-scoped lookup.
    - **Overwrites** any client `fileUrl` with the stored URL. A stored URL on an untrusted host → 422 "This file cannot be processed." (logged with the file ID only).
  - Applied in `QuizzesService`, `TestsService` and `ExamsService` `generateFromDocument`. Their modules import `FilesModule`, and the services inject `FilesService`.
  - `AiService.callDocumentPipeline` also calls `assertTrustedStoredFile` (defense in depth).
- **Files:**
  - New: `src/common/storage/trusted-storage-url.ts`, `src/common/storage/document-source.ts`, `src/common/storage/document-source.spec.ts`
  - Modified: `src/quizzes/quizzes.service.ts`, `src/tests/tests.service.ts`, `src/exams/exams.service.ts`, `src/quizzes/quizzes.module.ts`, `src/tests/tests.module.ts`, `src/exams/exams.module.ts`, `src/ai/ai.service.ts`, `src/ai/ai.service.spec.ts` (fixture cloud name set)
- **Tests (20):**
  - **Untrusted hosts** (10 cases): another cloud, http, look-alike host, userinfo trick, metadata IP, localhost, explicit port, prefix-only cloud name, `file:` scheme, empty.
  - Fail-closed without a cloud name.
  - **Valid file:** the stored URL is used and the client URL is ignored; legacy `documentId` is accepted.
  - URL-only → 400, no lookup.
  - **Unauthorized or missing file:** the access-check 404 propagates.
  - Untrusted stored URL → 422.
  - All three services send the stored trusted URL, reject URL-only requests, refuse untrusted stored URLs, and never call the AI service in those cases.
  - `AiService` refuses an untrusted stored URL.
- **API compatibility (contract tightening, approved):**
  - `generate-from-document` now **requires `fileId` or `documentId`**; `fileUrl` is ignored.
  - The response shape is unchanged.
  - Clients that sent only a URL now get 400. The frontend client declares this endpoint but no page calls it; to be verified once frontend access is granted.
- **Configuration:** `CLOUDINARY_CLOUD_NAME` is now **required for any document-based AI generation**. Without it, the request returns 422.
- **Not yet covered:**
  - **Ownership.** Any authenticated user can still use any file ID until the B4 migration and owner-scoped lookup are approved. The access-check seam is in place.
  - **The AI-service-side host allowlist.** The AI service repository is not accessible.

### 14e. Configuration checklist (B10 preparation)

- New `docs/CONFIGURATION_CHECKLIST.md`. It covers:
  - Every variable each service's code reads: required or optional, its effect when missing today versus after the proposed B10 change, and Render/local check columns.
  - Variables that can be removed.
  - Value-free verification commands (set/missing and length, plus a hash-prefix comparison of the two `AI_API_KEY`s).
  - A pre-deploy gate.
- B10 code is **not implemented**. It waits for the owner's confirmation of the configuration.

### 14f. Migration evidence package (revision 2)

- New `docs/migrations/MIGRATION_REVIEW.md`. It covers: the exact forward and rollback SQL, locking notes, read-only production count queries (results pending from the owner), the affected tables and columns, the handling of existing and unknown-ownership records, precise flag values and defaults, the deployment order and compatibility, and the backup, dry-run and recovery plan.
- Both SQL files were rewritten (revision 2) to add a nullable **`sharedConfirmedAt timestamptz`** to `files`, `quizzes`, `tests` and `exams`. Sharing of unknown-ownership rows now requires per-record confirmation. A global flag alone shares nothing.
- Flag values: `hidden` (default; also used for unset or invalid values) and `confirmed-shared-readonly`. Neither ever permits editing or deletion. Owned rows are always owner-only.
- `docs/proposals/B4_B6_OWNERSHIP_DESIGN.md` now carries a revision banner marking the old `shared-readonly` semantics as withdrawn.
- **SQL not executed anywhere.** Not even a rolled-back dry run on the local database, which would still be an execution.

### Batch 14 verification

| Command | Result |
|---|---|
| `npx tsc --noEmit -p tsconfig.build.json` | ✅ exit 0 |
| `npx vitest run` (full) | ✅ **105 passed / 0 failed** (17 files). This is the first fully green run; the 4 pre-existing failures are fixed. |
| `npx oxlint` on changed files | 0 new warnings (one pre-existing warning in `src/auth/dto/login.dto.ts`, untouched) |
| Read-only worktree run at `HEAD` | 4 failed / 1 passed (baseline proof) |

**Database or migration dependencies:** none for Batch 14 code. B4 and B6 code remains unwritten until migration approval.

### Pending: other repositories (blocked by directory permissions)

The following requested work has **not been started**. No files in those repositories were read or modified in this batch:

- **Frontend** (`C:\Users\USER\Desktop\gleamlearn-landing`): password change and reset payloads and UI; `lib/admin-api.ts`; API-call audit; shared UI states; the 3D visualization contract; and `docs/API_INTEGRATION.md`, `docs/UI_STATES.md`, `docs/AI_INTEGRATION.md` and `docs/IMPLEMENTATION_CHANGELOG.md`.
- **AI service** (`C:\Users\USER\Desktop\gleamlearn-ai-service`): the centralized integration layer, correlation IDs, a URL-fetch allowlist matching 14d, the visualization output contract, and `docs/AI_INTEGRATION.md`, `docs/API_REFERENCE.md`, `docs/SECURITY.md` and `docs/IMPLEMENTATION_CHANGELOG.md`. Its earlier Phase 1 changes (Batches 3–6) remain uncommitted in that working tree.

---

## Batch 15 (2026-10-12): Frontend password integration (cross-reference) and new reset-code findings

- **Frontend:** `gleamlearn-landing` now sends `confirmNewPassword` on change-password and reset-password, through new UI screens. See `gleamlearn-landing/docs/IMPLEMENTATION_CHANGELOG.md`, Batch 15.
- **Backend code changes in this batch:** none.
- **Contract checked:** the frontend bodies `{ oldPassword, newPassword, confirmNewPassword }` and `{ token, newPassword, confirmNewPassword }` match `ChangePasswordDto` and `ResetPasswordDto`, and are covered by `src/auth/change-password.spec.ts` and `src/auth/reset-password.spec.ts`.
- **New findings (not fixed; proposed):**
  1. `AuthService.forgotPassword` generates the 6-digit reset code with `Math.random()`, which is not cryptographically secure. **Proposal:** `crypto.randomInt(100000, 1000000)`.
  2. When the reset email fails to send, `forgotPassword` **prints the reset code to the server log** (`console.log('PASSWORD RESET OTP CODE FOR …')`). Anyone with log access can take over the account during the 10-minute window. **Proposal:** remove the code from the log and log only that delivery failed.
  3. The reset code and the email-verification OTP share the `verificationOtp` column, and the reset endpoint is limited only by IP throttling (3/min). **Proposal:** a per-account attempt limit. This needs design, and possibly a column (migration).

---

## Batch 16 (backend, 2026-10-12): Secure one-time codes and no secrets in logs

**Status:** ✅ Verified by unit tests, with a negative control against the old code.

### Problem (inspected in code)

- All three code-generation sites in `AuthService` used `Math.floor(100000 + Math.random() * 900000)`: `signup`, `resendVerification` and `forgotPassword`. `Math.random()` is predictable, not cryptographically secure.
- Codes were printed to the server log when email delivery failed:
  - `auth.service.ts`: "MANUAL VERIFICATION OTP CODE", "RESEND VERIFICATION OTP CODE FOR <email>", "PASSWORD RESET OTP CODE FOR <email>".
  - `mail.service.ts`: "OTP CODE" (×2), "2FA OTP CODE", "EMAIL CHANGE OTP CODE", plus the "MANUAL VERIFICATION LINK" and "MANUAL PASSWORD RESET LINK" URLs, which contain `?token=<code>`.
- **Why the verification codes matter too:** `resetPassword` looks users up by `verificationOtp`. That is the **same column** as the email-verification codes, so a signup or resend-verification code also works as a password-reset code. All of these codes are account-access secrets.

### Implementation

- New `src/common/security/otp.ts`: `generateOtp()` = `crypto.randomInt(100000, 1000000)`, the same 6-digit range and format as before. All three `AuthService` sites use it.
- All 7 secret-bearing log statements were removed (3 in `auth.service.ts`, 4 in `mail.service.ts`, the latter covering 4 codes and 2 tokenized links). Delivery failures are still logged, but without the code, the link or the recipient:
  - `auth.service.ts`: `console.warn('… could not be delivered.')`.
  - `mail.service.ts`: the existing `Logger.error('Failed to send … email: <SMTP error message>')`.

### Files changed

- New: `src/common/security/otp.ts`, `src/common/security/otp.spec.ts`
- Modified: `src/auth/auth.service.ts`, `src/mail/mail.service.ts`

### API, database and configuration impact

- **API:** none. Responses and code format are unchanged.
- **Database:** none.
- **Configuration:** none.
- **Operational:** if SMTP is down, a code can no longer be recovered from the logs. The user must request a new code once mail works again. That is intended.

### Testing

| Command | Result |
|---|---|
| `npx vitest run src/common/security` | ✅ 4 tests |
| Negative control (old log line temporarily restored in `forgotPassword`; old `mail.service.ts` restored through a path-limited stash; both put back afterwards and verified by `cmp`, with original LF line endings) | The two logging tests **fail** against the old code, as expected |
| Full `npx vitest run` | ✅ **109 passed / 0 failed** (18 files) |
| `npx tsc --noEmit -p tsconfig.build.json` | ✅ |
| `oxlint` on the changed files | No new warnings |

What the 4 tests cover:
- 2,000 generated codes all match `^[1-9]\d{5}$`; `crypto.randomInt(100000, 1000000)` is called; `Math.random` is **never** called.
- With mail failing, `forgotPassword` still stores and emails the code, and **no** console or Nest `Logger` line contains it.
- The same holds for `resendVerification`.
- All four `MailService` senders log neither the code nor any `token=` link on failure.

### Per-account rate limiting: review only (not implemented)

**Current protection:** IP throttling only (`@Throttle`: 3 per minute and 1 per 2 s for `forgot-password` and `reset-password`). It is in memory, per instance.

**Structural issue:**
- `POST /auth/reset-password` takes **only** `{ token, … }`, with no email. A guess is checked against *every* user who currently has a live code; reset and verification codes share a column and both last 10 minutes.
- An attacker therefore isn't targeting one account. With *N* live codes, each guess succeeds with probability *N* / 900,000.
- A per-account limit **cannot** be applied to this request as designed, because the request identifies no account.

**Safe design, which needs your decision:**
1. **Contract change:** `reset-password` requires `email` + `token`, and the lookup becomes `{ email, verificationOtp }`. The frontend reset page already follows the forgot-password page, so it can carry the email. This is a breaking change for any other client.
2. **Per-account attempt counter:** `passwordResetAttempts int` and `passwordResetLockedUntil timestamptz` on `users`, requiring a **migration**. Invalidate the code after 5 failed attempts.
3. **Separate columns** for reset and verification codes (also a migration), so a verification code can't reset a password.
4. In-memory per-email throttling of `forgot-password` (to stop email bombing) is possible with no schema change. It doesn't survive restarts and isn't shared across instances, so on its own it isn't a complete control.

**Recommendation:** items 1 and 3, plus item 2 with its migration, as one reviewed change.

### Related observation (not changed)

`resendVerification` returns `404 "User not found"` for unknown emails, which lets anyone check whether an email is registered. `forgotPassword` correctly returns the same response either way.

---

## ⚠️ Security finding (2026-10-12, during the Batch 17 admin inspection): admin password reset accepts user tokens

**Status:** ⬜ **Not fixed. Work paused for the owner's decision.** Found by code inspection only; it was **not** exploited or tested against any running system.

- **Location:** `src/admin/auth/admin-auth.service.ts`, `resetPassword()` (route `POST /api/v1/admin/auth/reset-password`, public, not throttled).
- **Logic:** `jwtService.verify(token)`, then `adminRepo.findOne({ where: { email: payload.email } })`, then the admin's `passwordHash` is replaced. There is no check of token type, audience or subject.
- **Why this is exploitable:**
  1. User and admin JWTs are signed with the **same** `JWT_SECRET` (`auth.module.ts` and `admin.module.ts`).
  2. `POST /api/v1/auth/signup` returns a signed user `accessToken` containing `email` **immediately**, before email verification. Its uniqueness check covers only the `users` table, not `admins`.
  3. Admin email addresses are discoverable. The default super-admin address is hard-coded in the public repository (`admin-auth.service.ts`).
- **Consequence:** anyone who signs up as a user with an admin's email address receives a token that this endpoint accepts as an admin reset token. They can then set that admin's password, including the **Super Admin's**. That is full administrative takeover.
- `AdminJwtAuthGuard` itself is **not** affected: it resolves `sub` against the `admins` table, so user tokens fail there. `resetPassword` is the only manual `jwtService.verify` in the codebase.
- **Related:** `forgotPassword` for admins never issues a token, so no legitimate client can use `reset-password` today.

**Recommended fix (ready to implement on approval; no migration):**
1. **Immediately:** make `POST /admin/auth/reset-password` refuse every token unless its payload has `type: 'admin_password_reset'` and a `sub` that matches an admin. No such tokens are issued today, so this effectively disables the endpoint without changing its path. Add tests showing that a user access token, an admin access token and a forged email are all rejected.
2. Add `type: 'user'` to user access tokens, and check `type` in both Passport strategies. Use a distinct audience or secret for admin tokens (`ADMIN_JWT_SECRET`); that is a configuration change on Render.
3. Implement a real admin reset flow (an emailed, single-use, short-lived token) as a separate reviewed change.

**Operational advice (owner's decision):** if the backend is deployed, consider shipping fix 1 promptly, and check the `admins` table for unexpected password changes (`updatedAt`). `JWT_SECRET` rotation, already in the remediation checklist, does not close this hole on its own.

---

## Batch 17-security (2026-10-12): Admin reset hardening, admin/learner token separation, unguarded export routes

**Status:** ✅ Verified by HTTP-level tests through the real Passport strategies and guards, with a negative control. ⬜ **Not deployed.** Deployment needs `ADMIN_JWT_SECRET` set on Render first (see the deployment sequence below).

### Inventory performed before changing anything

| Item | Location |
|---|---|
| Token issuers | `AuthService.signup` and `AuthService.login` (learner); `AdminAuthService.login` (admin) |
| Manual verifier | `AdminAuthService.resetPassword` (the only `jwtService.verify` in the codebase) |
| Strategies | `JwtStrategy` (`'jwt'`), `AdminJwtStrategy` (`'admin-jwt'`) |
| Guards | `JwtAuthGuard` / `AuthGuard('jwt')` (127 uses); `AdminJwtAuthGuard` (18 controllers) |
| JWT modules | `AuthModule` (`@Global`, exports `JwtModule`, so the learner `JwtService` is visible everywhere); `AdminAuthModule` (its own `JwtModule`) |
| Admin controllers | 19 under `api/v1/admin/*`. **`api/v1/admin/export` had NO guard.** |
| Admin session flow | `POST /admin/auth/login` → `{ accessToken, data }`; `GET /admin/auth/me` (guarded); `logout` is stateless; `refresh` returns a **placeholder** token (`'new-mock-admin-jwt'`, not changed); `forgot-password` sends **nothing** |

### 1. Admin password reset (critical): fixed

- `resetPassword` now accepts a token only if **all** of the following hold:
  - It is signed with `ADMIN_JWT_SECRET` (HS256).
  - It has `type === 'admin_password_reset'`.
  - It has a string `sub` that identifies an existing, **active** admin.
  - Its `email` matches that admin.
- Any failure gives the same `400 "Invalid or expired password reset token"`, with no write.
- If `ADMIN_JWT_SECRET` is not configured → 503.
- **Legitimate dependency check:** no code issues `admin_password_reset` tokens (`forgotPassword` sends nothing) and there is no admin frontend. **The endpoint is intentionally disabled in practice until a proper single-use reset flow is built** (separate reviewed change). No improvised token issuer was added.

### 2. Unguarded admin export routes (new, critical): fixed

`GET /api/v1/admin/export/users|analytics|transactions|activity` had no authentication. `/users` returned every learner's id, full name, username, email, education type, university and verification/restriction flags to **anyone**. It now uses `@UseGuards(AdminJwtAuthGuard)`, the same guard as every other admin controller. Paths and payloads are unchanged for admins.

### 3. Token separation

- **Claims:**
  - Learner tokens: `type: 'learner'` (signup and login).
  - Admin tokens: `type: 'admin'`.
  - Reset tokens: `type: 'admin_password_reset'`.
  - Constants live in `src/admin/auth/admin-jwt.config.ts`.
- **Secrets:**
  - Admin tokens are signed and verified **only** with `ADMIN_JWT_SECRET`, which is passed explicitly on every admin `sign`/`verify`, so the global learner `JwtService` is never used for admin tokens.
  - `AdminJwtStrategy` uses a `secretOrKeyProvider` with **no fallback**. `getAdminJwtSecret()` returns null when the variable is missing, shorter than 32 characters, or equal to `JWT_SECRET`.
  - The hard-coded admin fallbacks (`'your-super-secret-key'`, `'super-secret-jwt-key'`) were removed from the admin strategy and the admin module.
- **Verification rules:**
  - `AdminJwtStrategy` requires `type === 'admin'` and an active admin.
  - `JwtStrategy` rejects any `type` other than `'learner'`. Learner tokens without a claim (issued before this change) are still accepted, so learners aren't logged out on deploy. They expire within `JWT_EXPIRES_IN` (7 days), after which the legacy allowance can be removed.
  - A missing `sub` gives 401 instead of a query error.
- **Fail-safe:** when `ADMIN_JWT_SECRET` is invalid, the backend still **starts**. Admin login, all admin routes and admin reset return **503 "Admin authentication is not configured."** `AdminJwtAuthGuard` now passes that 503 through, because passport reports provider errors as `info`. An error is logged at startup naming the problem, never the value. Admin login checks the configuration **before** credentials. Learner auth is unaffected.
- **Admin token lifetime:** `ADMIN_JWT_EXPIRES_IN` (optional, default `8h`). Admin tokens previously reused the learner `7d`.
- **Not changed (B10, pending your configuration confirmation):** the learner `JWT_SECRET` fallback `'super-secret-jwt-key'` in `auth.module.ts` and `jwt.strategy.ts`.

### Files changed

- New: `src/admin/auth/admin-jwt.config.ts`, `src/admin/auth/admin-token-security.spec.ts`
- Modified:
  - `src/admin/auth/admin-auth.service.ts`
  - `src/admin/auth/strategies/admin-jwt.strategy.ts`
  - `src/admin/auth/guards/admin-jwt.guard.ts`
  - `src/admin/auth/admin.module.ts`
  - `src/admin/export/admin-export.controller.ts`
  - `src/auth/strategies/jwt.strategy.ts`
  - `src/auth/auth.service.ts`
  - `docs/CONFIGURATION_CHECKLIST.md`

### API compatibility

Paths and response shapes are unchanged. Behaviour changes:

| Change | Effect |
|---|---|
| Export routes | Now require an admin token |
| Existing admin tokens (signed with `JWT_SECRET`) | Invalid after deploy; admins sign in again |
| Admin token lifetime | 8 h |
| `ADMIN_JWT_SECRET` not configured | Admin endpoints return 503 |
| Learner tokens | New tokens carry `type`; old ones keep working until they expire |

### Database impact

None. No migration, and no records changed. The super-admin seeding is unchanged.

### Deployment and recovery sequence (owner actions; nothing was done in production)

1. **Before deploying:** in Render → backend → Environment, add `ADMIN_JWT_SECRET`: a new random value of ≥ 32 characters, **not** equal to `JWT_SECRET`. Optionally add `ADMIN_JWT_EXPIRES_IN`. Verify with the value-free command in `docs/CONFIGURATION_CHECKLIST.md`, section 3.
2. Deploy the backend.
3. Check the logs: there must be **no** "Admin authentication is DISABLED" line.
4. Admins sign in again. Old admin tokens stop working by design.
5. **Lock-out risk:**
   - If step 1 is skipped or the value is invalid, admins can't sign in (503) until it's fixed. Learners are unaffected.
   - The Super Admin's **password and record are not touched**, so setting the variable and restarting restores access. There is no permanent lock-out.
   - The Super Admin also can't be locked out through the reset endpoint, because it is disabled.
6. **Rollback:** redeploy the previous backend build. Old admin tokens, signed with `JWT_SECRET`, become valid again. **However, rolling back reopens the reset and export vulnerabilities**, so prefer fixing the configuration.
7. **After deploying,** check `admins` (read-only) for unexpected password changes or accounts: `SELECT id, email, role, "isActive", "updatedAt" FROM admins ORDER BY "updatedAt" DESC;`

### Testing

| Command | Result |
|---|---|
| `npx vitest run src/admin/auth/admin-token-security.spec.ts` | ✅ **26 tests** |
| **Negative control** (the original vulnerable `resetPassword` logic temporarily restored, then replaced from a saved copy and verified with `cmp`) | The "learner token carrying the admin email" test **fails**: the vulnerability is reproduced with mocks only. It passes with the fix. |
| Full `npx vitest run` | ✅ **135 passed / 0 failed** (19 files) |
| `npx tsc --noEmit -p tsconfig.build.json` | ✅ |
| `oxlint` on the changed files | No new warnings (the guard's unused `context` parameter is pre-existing) |

The 26 tests, run over real HTTP through the real strategies, guards, `AdminAuthController` and `AdminExportController`, with mocked repositories and config:

- **Reset endpoint (16).** The reported attack is rejected. So are: a learner-typed token signed with the admin secret, an admin access token, a reset-typed token signed with the learner secret, a reset token for a non-admin subject, a mismatched email, a missing subject, an expired token, a malformed token, the old fallback secret, a non-string token, and an inactive admin. None of these write anything. A correctly typed token is accepted (for the future flow), and a missing secret gives 503.
- **Cross-token (6).** Learner tokens work on learner routes only; admin tokens on admin routes only. A forged admin type with the learner secret, or a reset token used as an access token, is rejected. Legacy learner tokens are accepted on learner routes only. An inactive admin is rejected.
- **Fail-safe (3).** A missing, short, or reused `ADMIN_JWT_SECRET` gives 503 on admin routes and login, while learner routes keep working.
- **Existing behaviour (2).** Login issues an admin-typed token verifiable only with the admin secret; `/admin/auth/me` works with it and never returns `passwordHash`. A wrong password gives 401.
- **Export (1).** No token → 401; learner token → 401; admin token → 200.

### Outstanding (not changed)

- `AdminJwtAuthGuard` checks only that the caller is an active admin. There is **no per-role or per-permission authorization** on individual admin routes (for example, finance versus moderation), even though `roles` and `permissions` entities exist. Any active admin can use every admin route.
- `POST /admin/auth/refresh` returns a placeholder token.
- `POST /admin/auth/logout` is stateless: tokens remain valid until they expire.

---

## Security review: email enumeration and per-account limits (2026-10-12; recommendations only)

| Endpoint | Known email | Unknown email | Enumerable? | Recommendation |
|---|---|---|---|---|
| `POST /auth/forgot-password` | 200 "Password reset instructions sent to <email>" | Same | No | Keep. Optionally don't echo the email. |
| `POST /auth/resend-verification` | 200 "New verification code resent…"; 400 if already verified | **404 "User not found"** | **Yes** | Return the same 200 for unknown **and** already-verified emails ("If an account needs verification, a new code has been sent"). |
| `POST /auth/signup` | 409 "Email or username is already registered" | 201 | Yes (inherent to sign-up) | Accept, or move to "check your email" sign-up confirmation (a larger UX change). Throttling already applies. |
| `POST /admin/auth/forgot-password` | Neutral message | Same | No | Keep (it sends nothing yet). |
| `POST /admin/auth/login` | "Invalid admin credentials" | "Invalid admin credentials or account disabled" | **Slightly** (different text) | Use one message for both. |

**Why per-account rate limiting needs contract and/or storage changes:**
1. **Contract:** `POST /auth/reset-password` identifies **no account**; it carries only the code. A limit keyed by account can't be applied to a request that names none. Requiring `{ email, token, … }` is a breaking change for any client that doesn't send `email` (the new frontend reset page can be updated to send it).
2. **Storage:** a durable per-account counter, such as `users.passwordResetAttempts` and `users.passwordResetLockedUntil`, is a **migration**. In-memory counters reset on every restart and aren't shared between instances, so they can't be relied on as a security control.
3. **Shared column:** reset and verification codes share `verificationOtp`, so a verification code also resets passwords. Separating them is another schema change.
4. **No migration has been introduced.** The secure code generation and the removal of codes from logs (backend Batch 16) remain in place and are covered by tests.

---

## Proposal: flashcards routes lack the `api/v1` prefix (from frontend Batch 16; not changed)

- **Finding:** `src/flashcards/flashcards.controller.ts` is `@Controller('flashcards')` and `flashcard-decks.controller.ts` is `@Controller('flashcard-decks')`. Every other controller uses `api/v1/...`, and `main.ts` sets no global prefix. The frontend calls `/api/v1/flashcards…` and `/api/v1/flashcard-decks…` (12 endpoint methods), which all 404 today. The other 304 of the 316 frontend endpoint calls match a backend route by method and path.
- **Backward-compatible correction (proposed):** mount both paths with Nest's array form, `@Controller(['flashcards', 'api/v1/flashcards'])` and `@Controller(['flashcard-decks', 'api/v1/flashcard-decks'])`, so existing clients of the unprefixed paths keep working. Mark the unprefixed paths deprecated in Swagger, and remove them later after a notice period.
- **Tests to add with the change:** an HTTP routing spec (like `static-route-order.spec.ts`) asserting that each of the 12 frontend calls reaches the same handler under **both** prefixes, with `JwtAuthGuard` still applied. Re-run the contract audit, expecting 0 unmatched calls.
- Awaiting approval.

## Batch 17 (frontend cross-reference, 2026-10-12)

- The admin console in `gleamlearn-landing` (`src/app/admin/`, `src/lib/admin-api.ts`) uses: `POST /admin/auth/login`, `GET /admin/auth/me`, `POST /admin/auth/logout`, `GET /admin/dashboard` (only `users.total` and `users.new` are displayed), `GET /admin/users`, `GET /admin/users/:id`, `GET /admin/users/:id/activity` and `DELETE /admin/users/:id`.
- **Backend changes made for it** (in Batch 17-security above):
  - `AdminUsersService.findAll` and `findOne` now return `toAdminUserView(user)`, which removes `passwordHash`, `verificationOtp` (a live password-reset-capable code), `otpExpiresAt` and `refreshToken`.
  - `AdminUsersQueryDto.limit` is capped at 100 (`@Max(100)`).
  - Tests: `src/admin/users/admin-users-sanitize.spec.ts` (3). Full suite: **138 passed / 0 failed**.
- **Recorded backend defects (not fixed):** `PATCH /admin/users/:id/suspend`, `/unsuspend`, `/freeze`, `/unfreeze`, `/verify` and `/unverify` write an action log and return success **without changing the user**. Fixing them depends on the B2 user-entity reconciliation (`isFrozen` and `deletedAt` exist only on the second `users` entity). The admin UI shows these actions disabled.
