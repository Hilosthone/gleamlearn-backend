# Live HTTP verification (local, disposable)

These scripts exercise the **running** backend over real HTTP, without production data and without real email or AI calls. They provide the evidence for every "verified live" claim in the changelogs and in the frontend `docs/FRONTEND_BACKEND_INTEGRATION_AUDIT.md`.

**Safety:**

- **Database:**
  - Everything runs against `gleamlearn_e2e`, a separate database on the **local** Postgres server named by `.env`.
  - `e2e-db.mjs` and `start-backend.mjs` **refuse** a non-local host or a hosted `DATABASE_URL`.
  - The configured database is never touched.
- **Schema sync:** `DB_SYNCHRONIZE=true` is set only for `gleamlearn_e2e`. Recreate the database before each run: the two `User` entities (B2) make sync non-idempotent.
- **Email:** SMTP points at `smtp_sink.py`, which binds to `127.0.0.1`, uses dummy credentials, never relays, and stores messages in the OS temp folder (`E2E_MAIL_DIR`).
- **AI:** `AI_SERVICE_URL` points at a local address (`E2E_AI_URL`, default `http://127.0.0.1:8765`). No remote AI service is called.
- **Secrets:** tokens, codes and passwords are never printed. The seeded Super Admin credentials are read from `.env` inside the scripts.
- **Test accounts:** disposable learners use `@example.test` addresses.

## Run (from the backend repo root)

```bash
npx nest build                                   # compiles dist/ (does NOT run prisma contract emit)
git checkout -- tsconfig.build.tsbuildinfo       # the incremental cache is tracked
node test/live/e2e-db.mjs recreate               # fresh disposable database
python test/live/smtp_sink.py 2525 &             # local mail sink
node test/live/start-backend.mjs &               # backend on 127.0.0.1:5055
node test/live/backend-workflows.mjs             # backend workflows (exit code 1 on any failure)
node test/live/frontend-clients.mjs ../gleamlearn-landing .   # the real frontend clients against the live backend
node test/live/learner-session.mjs ../gleamlearn-landing     # Phase 2: learner sign-up/verify/sign-in, onboarding, freeze/delete, ownership
node test/live/learner-learning.mjs ../gleamlearn-landing    # Phase 3: catalog, enrolment, lessons, progress, stats
node test/live/probe-shapes.mjs                              # prints the response STRUCTURE of learner endpoints (no values)
# Cross-service AI contract (mock NVIDIA; proves NestJS → FastAPI wiring, NOT real NIM calls):
python test/live/mock_nim.py 8799 &                                   # OpenAI-compatible stand-in, 127.0.0.1 only
node test/live/start-ai-service.mjs ../gleamlearn-ai-service &        # real FastAPI with test key + dummy NVIDIA key
node test/live/ai-integration.mjs                                     # 14 checks
# Email behaviour: python test/live/smtp_blackhole.py 2526 & then E2E_SMTP_PORT=2526 node test/live/start-backend.mjs; node test/live/auth-timing.mjs
# Production-like schema (sync off): E2E_SYNC=false node test/live/start-backend.mjs
node test/live/e2e-db.mjs drop                   # optional clean-up
```

The scripts wait between calls because the auth routes are throttled per IP (for example, `reset-password` allows 3 requests per minute). A full `backend-workflows.mjs` run takes about 4 minutes.
