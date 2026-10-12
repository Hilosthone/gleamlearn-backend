# Configuration Checklist: Backend and AI Service

**Purpose:** a list of every environment variable that each service's code actually reads. The owner uses it to verify local and Render configuration **before** fail-fast validation (B10) is implemented and before any deploy.
**Prepared:** 2026-10-12, from a scan of `process.env.*`, `ConfigService.get(...)` and `os.getenv(...)` in active (uncommented) code.

**Rules**
- A variable counts as configured only once you have **seen it set in that service's Render Environment tab** (or in your local `.env`). Its appearance in a README, an example file or this document proves nothing.
- Never paste values into chats, tickets or docs. Record only ✅ / ❌ / date.
- Rotation steps for exposed credentials are in `docs/SECURITY_REMEDIATION_CHECKLIST.md`.

---

## 1. Backend (`mycoursea-backend`, Render service: backend)

"Fails today" describes current code. "Fails after B10" describes the proposed fail-fast validation, which is **not implemented yet** and waits for your confirmation.

| Variable | Required? | Used for | If missing today | If missing after B10 (proposed) | Render ✅ | Local ✅ |
|---|---|---|---|---|---|---|
| `JWT_SECRET` | **Yes** (≥ 32 chars) | Signing and verifying user and admin JWTs | Starts with a **public hard-coded fallback secret** (tokens forgeable) | **Won't start** | | |
| `ADMIN_JWT_SECRET` | **Yes** (≥ 32 chars, **different from `JWT_SECRET`**) | Signing and verifying **admin** JWTs only (backend Batch 17-security) | n/a before that batch | Backend **starts**, but admin login, every admin route and admin reset return **503**, with an error log naming the variable. Learner features are unaffected. There is no fallback. | | |
| `ADMIN_JWT_EXPIRES_IN` | No (default `8h`) | Admin token lifetime | Default | Default | | |
| `JWT_EXPIRES_IN` | No (default `7d`) | Token lifetime | Default used | Default used | | |
| `NODE_ENV` | **Yes on Render** (`production`) | Production detection | Reported as `development` | Production-only checks don't apply | | |
| `DATABASE_URL` | **Yes** | Prisma modules (calendar, reports, search, subscriptions, usage); TypeORM only if it contains `supabase.co` | Prisma modules fail at runtime | **Won't start** in production | | |
| `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME` | **Yes** unless `DATABASE_URL` is a `supabase.co` URL | TypeORM connection | Falls back to `localhost`/`postgres`/`postgres`/`mycoursea_db` | **Won't start** in production; local defaults kept for development | | |
| `DB_SYNCHRONIZE` | No (default `false`) | Opt-in schema sync (Batch 1) | Off (safe) | Off. **Must stay unset or `false` on Render.** | | |
| `AI_SERVICE_URL` | **Yes on Render** | Base URL of the AI service | Local default `http://127.0.0.1:8000`, so AI calls fail with 503 | **Won't start** in production | | |
| `AI_API_KEY` | **Yes** | Internal auth to the AI service (**must equal the AI service's value**) | Sent empty, so AI calls fail with 502 | **Won't start** | | |
| `AI_HTTP_TIMEOUT_MS` | No (default `120000`) | Backend → AI timeout | Default | Default | | |
| `REQUEST_VALIDATION` | No (default on) | `off` disables the global validation pipe | On | On | | |
| `CLOUDINARY_CLOUD_NAME` | **Yes** | Uploads, **and the trusted-URL check for document AI generation (Batch 14)** | Uploads fail; **all document-based generation returns 422** (no URL is trusted) | Warn at startup (proposal: make required) | | |
| `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | **Yes** for uploads | Cloudinary SDK | Uploads fail | Warn | | |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | **Yes** for signup verification and password reset | Email delivery | Emails fail (logged warning) | Warn | | |
| `FRONTEND_URL` | No (default `https://gleamlearn.vercel.app`) | Links in emails | Default | Default | | |
| `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD` | **Yes** (until seeding changes) | Super Admin seeding at startup | **Seeds with public hard-coded defaults** | Seeding skipped with a warning (no defaults) | | |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | No | Push notifications | Push disabled or fails | Warn | | |
| `YOUTUBE_API_KEY` | No | YouTube title and thumbnail metadata | Generic title used | Warn | | |
| `ALOC_API_KEY`, `ALOC_BASE_URL` | No | Past-question import (exam prep) | That feature fails | Warn | | |
| `PORT` | No (Render sets it) | Listen port | `5000` | `5000` | | |
| `LEGACY_FILES_ACCESS` | **Only after the B4 migration** | Fail-closed legacy file visibility (see design) | n/a (not read yet) | Default `hidden` | | |
| `LEGACY_ASSESSMENTS_ACCESS` | **Only after the B6 migration** | Fail-closed legacy quiz/test/exam visibility | n/a (not read yet) | Default `hidden` | | |

**Not read by backend code; remove from the backend environment:** `OPEN_AI_KEY`, `OPENAI_API_KEY`, `NVIDIA_API_KEY`, `NVIDIA_BASE_URL`, `CLOUDINARY_API_ENVIROMENT`.

## 2. AI service (`gleamlearn-ai-service`, Render service: AI)

| Variable | Required? | Used for | If missing | Render ✅ | Local ✅ |
|---|---|---|---|---|---|
| `AI_API_KEY` | **Yes** (**same value as the backend**) | Internal auth (Bearer or `X-API-Key`) | **Won't start** (enforced since Batch 3) | | |
| `NVIDIA_API_KEY` | **Yes** | NVIDIA NIM | **Won't start** | | |
| `NVIDIA_MODEL` | **Yes** (currently `z-ai/glm-5.3-flash`) | Model ID | **Won't start** | | |
| `NVIDIA_BASE_URL` | No (default `https://integrate.api.nvidia.com/v1`) | Provider endpoint | Default | | |
| `NVIDIA_TIMEOUT_SECONDS` | No (default `90`) | Provider timeout | Default | | |
| `NVIDIA_MAX_RETRIES` | No (default `1`) | Bounded SDK retries | Default | | |
| `MAX_DOCUMENT_BYTES` | No (default 25 MB) | Download cap | Default | | |
| `DOCUMENT_FETCH_TIMEOUT_SECONDS` | No (default `30`) | Document download timeout | Default | | |

**Not read by AI-service code:** `OPENAI_API_KEY` (it appears only in commented legacy code and the outdated README).

## 3. Verifying without revealing values

On a Render **Shell** for each service (or locally), print only whether each variable is set and how long it is:

```sh
# Backend
node -e "for (const k of ['NODE_ENV','JWT_SECRET','ADMIN_JWT_SECRET','DATABASE_URL','DATABASE_HOST','DATABASE_USER','DATABASE_PASSWORD','DATABASE_NAME','AI_SERVICE_URL','AI_API_KEY','CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET','SMTP_HOST','SMTP_USER','SMTP_PASS','MAIL_FROM','SUPER_ADMIN_EMAIL','SUPER_ADMIN_PASSWORD','DB_SYNCHRONIZE']) { const v = process.env[k]; console.log(k.padEnd(24), v ? 'SET (len ' + v.length + ')' : 'MISSING'); }"

# AI service
python -c "import os; [print(k.ljust(24), ('SET (len %d)' % len(os.environ[k])) if os.environ.get(k) else 'MISSING') for k in ['AI_API_KEY','NVIDIA_API_KEY','NVIDIA_MODEL','NVIDIA_BASE_URL']]"
```

To confirm the two `AI_API_KEY` values match without printing them, compare a short hash prefix in each service's shell. The prefix is not reversible:

```sh
node -e "console.log(require('crypto').createHash('sha256').update(process.env.AI_API_KEY||'').digest('hex').slice(0,8))"
python -c "import os,hashlib; print(hashlib.sha256(os.environ.get('AI_API_KEY','').encode()).hexdigest()[:8])"
```

## 4. Before the next deploy

1. All **Required** rows above are ✅ on Render for both services.
2. `ADMIN_JWT_SECRET` is set on the backend: a new random value of at least 32 characters, different from `JWT_SECRET`. Without it, admin access is disabled (503) after the next deploy.
3. `AI_API_KEY` has been rotated (it is confirmed exposed) and the hash prefixes match between the services.
4. `NODE_ENV=production` is set on the backend.
5. `DB_SYNCHRONIZE` is unset or `false`.
6. `CLOUDINARY_CLOUD_NAME` is set. Without it, document-based AI generation is refused.
7. Then tell me the configuration is confirmed, and I'll implement the B10 fail-fast validation. It adds no insecure fallbacks and puts no values in logs.
