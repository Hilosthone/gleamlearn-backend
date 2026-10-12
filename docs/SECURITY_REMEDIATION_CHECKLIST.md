# Credential Exposure: Remediation Checklist

**Status:** prepared 2026-10-11. **Nothing in this checklist has been executed.** The project owner performs every rotation, Render change, history rewrite and deployment.

**Rule:** treat every credential listed under "Exposed" as **compromised until rotated**. Never paste secret values into chats, tickets, commits or documentation. Refer to variables by name only.

---

## 1. What was found (evidence, no values)

| Item | Evidence | Classification |
|---|---|---|
| AI service `AI_API_KEY` | Repository `Hilosthone/gleamlearn-ai-service` is **public** (GitHub API, 2026-10-11). Commit `bb99205` (2026-09-12) contains `.env` with `AI_API_KEY`. The current local value is **identical** (compared by hash). `.env` was removed from the tree in `5e83060` but remains in history. | **Exposed** |
| Backend fallback JWT secrets | Repository `Hilosthone/gleamlearn-backend` (formerly `mycoursea-backend`) is **public**. Hard-coded `JWT_SECRET` fallbacks are in `src/auth/auth.module.ts`, `src/auth/strategies/jwt.strategy.ts`, `src/admin/auth/admin.module.ts` and `src/admin/auth/strategies/admin-jwt.strategy.ts`. | Exposed **if** any deployment ever ran without `JWT_SECRET` |
| Default super-admin credentials | Hard-coded in `src/admin/auth/admin-auth.service.ts` (`onModuleInit`), which seeds a Super Admin at startup when `SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD` are unset. | Exposed **if** seeding ever ran without `SUPER_ADMIN_PASSWORD` |
| NVIDIA API key (`NVIDIA_API_KEY`) | Searched all 13 AI-service commits and 52 backend commits for `nvapi-` and `NVIDIA_API_KEY=`: **not found**. | Not found in history. Rotation is still advised as a precaution (see 2.1). |
| Other backend secrets (`DATABASE_PASSWORD`, `CLOUDINARY_API_SECRET`, `SMTP_PASS`, `FIREBASE_PRIVATE_KEY`, connection strings) | History searched for these assignments and for `PRIVATE KEY-----` and `postgresql://`: **not found**. No `.env` was ever committed to the backend. | Not found |
| Currently tracked `.env` files | `git ls-files` in both repos: **none**. Both `.gitignore` files exclude `.env`. | OK |

Additional context:
- Backend refresh tokens are not implemented. `AuthService.refreshToken` returns a placeholder. Sessions are the access JWTs alone (`JWT_EXPIRES_IN`, default 7 days), so rotating `JWT_SECRET` invalidates **all** sessions at once, with no database change.
- The backend `.env` contains `NVIDIA_API_KEY` and `OPEN_AI_KEY`, which the backend code never reads. Remove them from the backend environment to shrink the exposure surface.

---

## 2. Rotation steps (owner)

Perform in a quiet period. Keep a private record of *when* each step was done, never *what* the values are.

### 2.1 NVIDIA API key (precautionary)
1. In the NVIDIA API catalog account, create a new API key.
2. Render → **AI service** → Environment: replace `NVIDIA_API_KEY`. Do not add it to the backend.
3. Redeploy the AI service. Confirm `GET /` returns 200. The service refuses to start if `NVIDIA_API_KEY` is missing.
4. Revoke the old key in NVIDIA.
5. Update your local AI-service `.env`.

### 2.2 Internal `AI_API_KEY` (**required**: confirmed exposed)
1. Generate a new random value locally, for example `python -c "import secrets; print(secrets.token_urlsafe(48))"`. Copy it straight into the Render dashboard and do not paste it anywhere else.
2. Render → **AI service** → set `AI_API_KEY` to the new value.
3. Render → **backend** → set `AI_API_KEY` to the **same** value.
4. Deploy the AI service, then the backend, back to back. AI calls fail with a safe 502 between the two deploys. The deploy order between the two services doesn't otherwise matter (the backend sends both header styles).
5. Update both local `.env` files to one shared value. They currently differ.
6. Verification (no secrets involved): an authenticated AI request through the backend succeeds, and a direct call to the AI service with the **old** value returns 401.

### 2.3 `JWT_SECRET`
- **Verify first:** in Render → backend → Environment, confirm that `JWT_SECRET` exists and is long (≥ 32 characters). Check the dashboard; do not print the value. Also check the Render deploy and environment history for any period when it was missing.
- **Rotate if** it was ever missing, was short or guessable, was shared, or you are unsure:
  1. Generate a new value (≥ 48 random characters) and set it in Render → backend.
  2. Redeploy. **Effect:** every user and admin is logged out (all existing JWTs fail verification). No database change is needed.
  3. Tell users they need to sign in again.

### 2.4 Super-admin password
- **Verify:** confirm `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` are set in Render → backend.
- **Replace if** either was ever unset when the app started, or the current password is weak or reused. If `SUPER_ADMIN_EMAIL` was unset, the seeded admin uses the hard-coded default address. Changing the variable later does **not** change the existing admin row: seeding only runs when no admin with that email exists.
  1. Use the existing admin reset flow: `POST /api/v1/admin/auth/forgot-password`, then `POST /api/v1/admin/auth/reset-password`. This requires working SMTP settings and access to the super-admin mailbox. If that isn't possible, an approved, targeted database update of that one admin's `passwordHash` (bcrypt) is needed. That is a database write and needs separate approval.
  2. Review the `admins` table for unexpected accounts (read-only query: `SELECT id, email, role, "isActive", "createdAt" FROM admins ORDER BY "createdAt";`).
  3. After B10 is implemented, seeding will skip when credentials are unset, instead of using defaults.

### 2.5 Other variables to verify (no rotation evidence needed)

| Variable | Service | Check |
|---|---|---|
| `NODE_ENV` | backend | Set to `production` on Render (currently unset) |
| `DATABASE_URL`, or `DATABASE_HOST`/`PORT`/`USER`/`PASSWORD`/`NAME` | backend | Present, and not the local defaults (`localhost`/`postgres`) |
| `DB_SYNCHRONIZE` | backend | Unset or `false` |
| `AI_SERVICE_URL` | backend | Points to the deployed AI service |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | backend | Present |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | backend | Present (needed for verification email) |
| `NVIDIA_MODEL` | AI service | Present (startup fails without it) |

---

## 3. Prevent future commits of secrets

Already in place: `.env` is ignored in both repositories, and no `.env` is currently tracked.

Recommended (owner decides; each is a repository change):
1. Add a `.env.example` to each repository with variable **names only**. The AI service README currently shows `AI_API_KEY=` placeholders, which is fine.
2. Enable GitHub **secret scanning and push protection** for both repositories (Settings → Code security). It is free for public repositories.
3. Optionally, a local pre-commit hook that blocks staged `.env*` files and strings like `nvapi-`.
4. Remove the hard-coded fallback secrets and default admin credentials from the code (B10). Prepared, awaiting approval.

---

## 4. Git history cleanup (separate, coordinated operation)

Only after **all exposed values are rotated**. Rewriting history does not un-leak anything: forks, clones and caches may already hold the old commits. The purpose is hygiene.

1. **Backup:** `git clone --mirror https://github.com/Hilosthone/gleamlearn-ai-service.git gleamlearn-ai-service-backup.git`. Store it privately.
2. **Coordinate:** tell every collaborator. Open branches and PRs will need to be re-cloned or rebased after the force-push. Pick a time window.
3. **Rewrite** (AI service only; the backend history contains no `.env`): use `git filter-repo --path .env --invert-paths` on a fresh mirror clone. (`git filter-repo` is a separate install.)
4. **Force-push** all branches and tags. Ask GitHub Support to purge cached views of the old commits if needed.
5. **Re-clone** all working copies, including `C:\Users\USER\Desktop\gleamlearn-ai-service`. Uncommitted local work must be saved first. That clone currently has uncommitted Phase 1 and 2 changes.
6. Verify: `git log --all -- .env` returns nothing in a fresh clone.

---

## 5. Sign-off

| Step | Done (date) | By |
|---|---|---|
| 2.1 NVIDIA key rotated | | |
| 2.2 `AI_API_KEY` rotated in both services | | |
| 2.3 `JWT_SECRET` verified / rotated | | |
| 2.4 Super-admin password verified / replaced; admins reviewed | | |
| 2.5 Other variables verified | | |
| 3 Push protection enabled | | |
| 4 History cleanup completed | | |
