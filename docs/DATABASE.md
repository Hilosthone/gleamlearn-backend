# Database

Verified from code on **2026-10-20** (`src/app.module.ts`, entities, `prisma/`). Production facts are marked *owner-confirmed* or *read-only-verified*.

## Environments: kept strictly separate

| | Local development | Production |
|---|---|---|
| Database | Local PostgreSQL (pgAdmin), database `mycoursea_db` | **Supabase** PostgreSQL (*owner-confirmed*) |
| Backend | `npm run start:dev` on this machine | NestJS on Render |
| Connection settings | `.env`: `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME` (local `DATABASE_URL` is **not** a Supabase URL) | Render: **only** `DATABASE_URL` (*owner-confirmed*) |
| Schema sync | Off unless `DB_SYNCHRONIZE=true` | Off (`DB_SYNCHRONIZE` unset) since commit `5a0c4cc` |
| Live tests | `test/live/*` use a **separate** database, `gleamlearn_e2e`, on the local server. The scripts refuse non-local hosts and any `DATABASE_URL` containing `supabase.co`. | Never used by tests |

**Guard rail:** don't put the Supabase `DATABASE_URL` in the local `.env`. The code would then connect the local backend to production (see the next section).

## How the TypeORM connection is chosen (`src/app.module.ts`, `TypeOrmModule.forRootAsync`)

```ts
const databaseUrl = configService.get('DATABASE_URL');
const synchronize = configService.get('DB_SYNCHRONIZE', 'false').toLowerCase() === 'true';
if (databaseUrl && databaseUrl.includes('supabase.co')) {
  return { type: 'postgres', url: databaseUrl, autoLoadEntities: true, synchronize, ssl: { rejectUnauthorized: false } };
}
return { type: 'postgres', host: DATABASE_HOST ?? 'localhost', port: DATABASE_PORT ?? 5432,
         username: DATABASE_USER ?? 'postgres', password: DATABASE_PASSWORD ?? 'postgres',
         database: DATABASE_NAME ?? 'mycoursea_db', autoLoadEntities: true, synchronize };
```

- **Production:** `DATABASE_URL` contains `supabase.co`, so the **URL branch** is used, with TLS. Both the direct host (`db.<ref>.supabase.co`) and the pooler host (`*.pooler.supabase.com`) contain that text.
  - *Read-only-verified:* `GET /api/v1/health/database` returns `connected: true`. That check runs `SELECT 1` on **this same TypeORM connection**, so production is connected to Supabase.
- **No `DB_HOST`, `DB_NAME`, `DATABASE_NAME` or `DB_SYNCHRONIZE` is needed on Render.** The host branch is only used when `DATABASE_URL` isn't a Supabase URL.
- **Schema:** none is configured, so TypeORM uses the connection's `search_path`, which is `public` on Supabase. The app's table is **`public.users`**. Supabase's own `auth.users` is unrelated.
- **Prisma** (the `search`, `calendar`, `reports` and `subscriptions` modules) reads `process.env.DATABASE_URL` directly (`src/prisma/prisma.service.ts`). So locally, Prisma uses whatever `DATABASE_URL` the local `.env` contains.

## Schema history: there are no migrations

| Period | `synchronize` | Effect |
|---|---|---|
| Until commit `5a0c4cc` (2026-10-12) | **`true` hard-coded** | Every boot made TypeORM rewrite tables to match the entities |
| Since `5a0c4cc` | `DB_SYNCHRONIZE=true` only (unset on Render, so **off**) | Nothing changes the schema |

No migration tables or files exist. `prisma contract emit` (in `npm run build`) only generates the client; it doesn't push the schema.

## Three definitions map one table (`public.users`), and they conflict (B2)

| Definition | File | Used by |
|---|---|---|
| Auth `User` (TypeORM) | `src/auth/entities/user.entity.ts` | **Sign-up, login, verify, reset, `/auth/me`**, admin users, account status |
| Users-module `User` (TypeORM) | `src/users/users.entity.ts` | Registered in `UsersModule` (the users service itself uses the auth entity) |
| Prisma `User` | `prisma/schema.prisma` (`@@map("users")`) | Search, calendar, reports, subscriptions |

The definitions disagree:
- **Columns only in the auth entity:** `verification_otp`, `otp_expires_at`, `refresh_token`, `is_restricted`, `restriction_reason`, `created_at`, `updated_at`, `secondaryClass`, `secondaryStream`, `faculty`, `courseOfStudy`, `level`, `examAimOrGoals`.
- **Columns only in the users-module entity:** `createdAt`, `updatedAt`, `deletedAt`, `isFrozen`, `role`, `institution`, `levelOrClass`, `preferredLearningPace`, `academicGoals`.
- **Type conflict:** `fullName` is `varchar` in one entity and `varchar(150)` in the other.

**Reproduced locally (2026-10-20, disposable database, sync on):**
1. On an **empty** database, boot 1 creates the union of both entities and works.
2. As soon as `users` has rows, every later synced boot **fails** with `column "fullName" … contains null values`, and the backend doesn't start. The sync transaction rolls back, so nothing is lost.
3. On Render, a deploy that fails to start leaves the **previous** deploy running.

**Consequence (predicted, to be confirmed with the Supabase SQL):**
- After production had its first users, the schema froze.
- The columns added to the auth entity on **2026-10-01** never reached Supabase: `verification_otp`, `otp_expires_at`, `refresh_token`, `is_restricted`, `restriction_reason`, `created_at`, `updated_at`.
- When `5a0c4cc` turned sync off, deploys succeeded again, and the current code started querying those columns. That gives 500 on login and forgot-password.

## Diagnosis and fix

- **Inspect (read-only, both environments):** `docs/diagnostics/users-schema-inspection.sql`.
  - Validated on both local databases: section 3 shows every column as `ok`.
  - On a simulated copy missing the seven columns, it lists all seven, and flags the `createdAt`/`updatedAt` twins for the two timestamps.
- **Decision table and per-column SQL (not executed):** `docs/migrations/proposed/2026-10-20_users_missing_columns.sql`.
- **Owner steps:** `docs/PRODUCTION_RECOVERY.md`.
- **Never** turn on `DB_SYNCHRONIZE` against Supabase. With rows present, it fails at boot; with the conflict resolved the wrong way, it can drop columns.
