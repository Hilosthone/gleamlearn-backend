// scripts/db/migrator.mjs — GleamLearn's SQL migration runner (core). The CLI is scripts/db/migrate.mjs.
//
// Plain Node + the existing "pg" dependency, so it runs without a build and without new packages.
// Design (see database/README.md):
//   - migrations are files database/migrations/<14-digit version>_<name>.sql, applied in version order;
//   - each file is split into statements by a real SQL lexer (scripts/db/sql-lexer.mjs); any statement that would
//     start, end or alter a transaction is refused before anything runs;
//   - history table public.schema_migrations records each applied (or baselined) migration with a SHA-256 checksum;
//   - each migration runs in ONE transaction that takes a transaction-level advisory lock, creates the history table if
//     needed, re-checks the history (version AND checksum), runs every statement separately through the extended
//     query protocol (one statement each, enforced by PostgreSQL), checks the transaction is still the same one, then
//     records it. A failure rolls everything back — including a history table created in that transaction;
//   - files marked "-- migrate:no-transaction" (one statement, e.g. CREATE INDEX CONCURRENTLY) run outside a
//     transaction under a session advisory lock, which needs a direct or session-mode connection;
//   - "baseline" records an already-applied migration ONLY after the live schema matches its pinned expected snapshot
//     (<migration>.schema.json, SHA-256 pinned in the migration file), compared using built-in catalogue queries in a
//     READ ONLY transaction.
// Nothing here runs at application start-up or during "npm run build".

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { SqlLexError, splitStatements, transactionControl } from './sql-lexer.mjs';
import { compareSchema, readSchema, validateSnapshot } from './schema-snapshot.mjs';

export const HISTORY = '"public"."schema_migrations"';
/** Advisory-lock key shared by every runner (arbitrary constant; must not change). */
export const LOCK_KEY = '4812090731120028';
export const FILE_PATTERN = /^(\d{14})_([a-z0-9]+(?:_[a-z0-9]+)*)\.sql$/;
const NO_TX_MARKER = /^--\s*migrate:no-transaction\s*$/m;
const SNAPSHOT_PIN = /^--\s*schema-snapshot-sha256:\s*([0-9a-f]{64})\s*$/m;
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
/** Every variable that decides which database is used (see loadEnvironment). */
export const TARGET_VARS = [
  'DATABASE_URL',
  'DATABASE_HOST',
  'DATABASE_PORT',
  'DATABASE_USER',
  'DATABASE_PASSWORD',
  'DATABASE_NAME',
  'MIGRATION_DATABASE_URL',
  'MIGRATION_DATABASE_SSL_ROOT_CERT',
  'MIGRATION_STRICT_TARGET',
];

export class MigrationError extends Error {}

// ---------------------------------------------------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------------------------------------------------

function parseEnvFile(file) {
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const i = t.indexOf('=');
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

/**
 * The variables the runner reads.
 *   - Default (no --target-env-file): the project's .env, with variables already in the environment winning (like dotenv and
 *     the API). A missing .env is fine.
 *   - Explicit --target-env-file: the file MUST exist, and every database-target variable (TARGET_VARS) comes from that file
 *     only — inherited ones are ignored — so the file fully decides the target.
 */
export function loadEnvironment({ envFile, explicit = false, base = process.env, defaultFile }) {
  if (explicit) {
    if (!envFile || !fs.existsSync(envFile)) throw new MigrationError(`--target-env-file not found: ${envFile}`);
    const env = { ...base };
    for (const k of TARGET_VARS) delete env[k];
    return { ...env, ...parseEnvFile(envFile) };
  }
  const env = { ...base };
  if (defaultFile && fs.existsSync(defaultFile)) for (const [k, v] of Object.entries(parseEnvFile(defaultFile))) if (env[k] === undefined) env[k] = v;
  return env;
}

const isLocalHost = (h) => LOCAL_HOSTS.has(String(h).toLowerCase());
const truthy = (v) => /^(1|true|yes)$/i.test(String(v ?? '').trim());
const INSECURE_SSLMODES = new Set(['disable', 'allow', 'prefer', 'require', 'no-verify', 'verify-ca']);
const SSL_PARAMS = ['sslmode', 'ssl', 'sslcert', 'sslkey', 'sslrootcert', 'sslpassword', 'sslnegotiation', 'uselibpqcompat'];

/**
 * TLS options for the runner. Local targets: none (as before). Any other host: certificates are VERIFIED, including
 * the host name (rejectUnauthorized: true), against MIGRATION_DATABASE_SSL_ROOT_CERT (a PEM file path; for Supabase,
 * the project's CA certificate from Dashboard → Database → SSL) or Node's built-in public CAs.
 * The API's own connection settings are not affected.
 */
function tlsFor(host, env) {
  if (isLocalHost(host)) return undefined;
  const certPath = env.MIGRATION_DATABASE_SSL_ROOT_CERT?.trim();
  if (env.MIGRATION_DATABASE_SSL_ROOT_CERT !== undefined && !certPath) throw new MigrationError('MIGRATION_DATABASE_SSL_ROOT_CERT is set but empty.');
  if (certPath && !fs.existsSync(certPath)) throw new MigrationError(`MIGRATION_DATABASE_SSL_ROOT_CERT file not found: ${certPath}`);
  return { rejectUnauthorized: true, ...(certPath ? { ca: fs.readFileSync(certPath, 'utf8') } : {}) };
}

/**
 * Which database the runner uses. Validates everything before any connection is opened.
 *
 *   - MIGRATION_DATABASE_URL, when present, is the target. Present but blank or invalid is an ERROR (never a silent
 *     fallback).
 *   - Strict mode (--strict-target or MIGRATION_STRICT_TARGET=true): MIGRATION_DATABASE_URL is REQUIRED; the API's
 *     DATABASE_URL / DATABASE_HOST are never used.
 *   - Otherwise the API's own rules (src/database/connection-config.ts; a spec checks they agree): DATABASE_URL when it
 *     points at Supabase, else DATABASE_HOST / DATABASE_PORT / DATABASE_USER / DATABASE_PASSWORD / DATABASE_NAME.
 *
 * Non-local URLs: sslmode may only be absent or "verify-full"; other ssl* URL parameters are refused (they would
 * override the verified TLS settings in the pg driver). Returns pg options and a password-free description.
 */
export function resolveTarget(env, { strict = false } = {}) {
  const strictMode = strict || truthy(env.MIGRATION_STRICT_TARGET);
  const hasOverride = env.MIGRATION_DATABASE_URL !== undefined;
  if (hasOverride && !env.MIGRATION_DATABASE_URL.trim()) throw new MigrationError('MIGRATION_DATABASE_URL is set but empty; refusing to fall back to the API database.');
  if (strictMode && !hasOverride) throw new MigrationError('Strict target mode: MIGRATION_DATABASE_URL is required; the API database settings are not used.');

  const url = hasOverride ? env.MIGRATION_DATABASE_URL.trim() : env.DATABASE_URL?.includes('supabase.co') ? env.DATABASE_URL : '';
  const source = hasOverride ? 'MIGRATION_DATABASE_URL' : url ? 'DATABASE_URL' : 'DATABASE_HOST/DATABASE_NAME';
  if (url) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      throw new MigrationError(`${source} is not a valid URL.`);
    }
    if (!/^postgres(ql)?:$/.test(parsed.protocol)) throw new MigrationError(`${source} must start with postgres:// or postgresql://.`);
    if (!parsed.hostname) throw new MigrationError(`${source} has no host.`);
    safeDecode(parsed.password, source); // validate only; never kept or printed
    const database = safeDecode(parsed.pathname.replace(/^\//, ''), source);
    if (!database) throw new MigrationError(`${source} has no database name.`);
    const port = Number(parsed.port || 5432);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new MigrationError(`${source} has an invalid port.`);
    const local = isLocalHost(parsed.hostname);
    if (!local) {
      for (const p of parsed.searchParams.keys()) {
        if (!SSL_PARAMS.includes(p)) continue;
        if (p === 'sslmode' && parsed.searchParams.get('sslmode') === 'verify-full') continue;
        throw new MigrationError(
          INSECURE_SSLMODES.has(parsed.searchParams.get('sslmode') ?? '') && p === 'sslmode'
            ? `${source} has sslmode=${parsed.searchParams.get('sslmode')}, which does not verify the server. Remove it (certificates are always verified) or use sslmode=verify-full.`
            : `${source} has the TLS parameter "${p}"; remove it and use MIGRATION_DATABASE_SSL_ROOT_CERT for a CA file.`,
        );
      }
    }
    for (const p of SSL_PARAMS) parsed.searchParams.delete(p); // TLS comes only from tlsFor()
    const ssl = tlsFor(parsed.hostname, env);
    return {
      options: { connectionString: parsed.toString(), ...(ssl ? { ssl } : {}) },
      source,
      host: parsed.hostname,
      port,
      database,
      user: safeDecode(parsed.username || '', source),
      local,
      strict: strictMode,
    };
  }
  const host = (env.DATABASE_HOST ?? 'localhost').trim();
  if (!host) throw new MigrationError('DATABASE_HOST is empty.');
  const port = Number(env.DATABASE_PORT ?? '5432');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new MigrationError('DATABASE_PORT is not a valid port number.');
  const database = (env.DATABASE_NAME ?? 'mycoursea_db').trim();
  if (!database) throw new MigrationError('DATABASE_NAME is empty.');
  const user = env.DATABASE_USER ?? 'postgres';
  const ssl = tlsFor(host, env);
  return {
    options: { host, port, user, password: env.DATABASE_PASSWORD ?? 'postgres', database, ...(ssl ? { ssl } : {}) },
    source,
    host,
    port,
    database,
    user,
    local: isLocalHost(host),
    strict: strictMode,
  };
}

function safeDecode(s, source) {
  try {
    return decodeURIComponent(s);
  } catch {
    throw new MigrationError(`${source} contains invalid percent-encoding.`);
  }
}

export const describeTarget = (t) =>
  `${t.database} on ${t.host}:${t.port} as ${t.user || '(default user)'} (from ${t.source}${t.strict ? ', strict' : ''}${t.local ? ', local' : ', REMOTE, TLS verified'})`;
/** What --confirm-target must say for ANY write (local or remote): database@host:port of the resolved target. */
export const confirmationFor = (t) => `${t.database}@${t.host}:${t.port}`;

/** After connecting: the server must report the database we resolved (catches poolers/proxies routing elsewhere). */
export async function assertConnectedTarget(client, target) {
  const r = await client.query('SELECT current_database() AS db');
  if (r.rows[0].db !== target.database) throw new MigrationError(`Connected to database "${r.rows[0].db}", expected "${target.database}". Nothing was done.`);
}

// ---------------------------------------------------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------------------------------------------------

export const checksum = (text) => crypto.createHash('sha256').update(text.replace(/\r\n/g, '\n'), 'utf8').digest('hex');

/** Statements of a migration, refusing anything that would start, end or alter the runner's transaction. */
export function parseMigrationSql(sql, file = 'migration') {
  let statements;
  try {
    statements = splitStatements(sql);
  } catch (e) {
    if (e instanceof SqlLexError) throw new MigrationError(`${file}: ${e.message}`);
    throw e;
  }
  const bad = statements.map((s) => [s, transactionControl(s.text)]).filter(([, tc]) => tc);
  if (bad.length) {
    throw new MigrationError(`${file}: transaction control is not allowed (the runner owns the transaction): ${bad.map(([s, tc]) => `${tc} at line ${s.line}`).join(', ')}`);
  }
  return statements;
}

/**
 * All migrations in the directory, ordered by version. Throws on anything ambiguous: a bad file name, a duplicate
 * version, an empty file, transaction control, an unterminated string/comment, a no-transaction file with more than
 * one statement, or an obsolete .verify.sql file. "<file>.schema.json" files are baseline snapshots, not migrations.
 */
export function discoverMigrations(dir) {
  if (!fs.existsSync(dir)) throw new MigrationError(`Migrations directory not found: ${dir}`);
  const out = [];
  const problems = [];
  for (const file of fs.readdirSync(dir).sort()) {
    if (file.endsWith('.verify.sql')) {
      problems.push(`${file}: executable verification files are no longer supported; use a pinned <migration>.schema.json`);
      continue;
    }
    if (!file.endsWith('.sql')) continue;
    const m = FILE_PATTERN.exec(file);
    if (!m) {
      problems.push(`${file}: name must be <14-digit version>_<lower_snake_name>.sql`);
      continue;
    }
    const full = path.join(dir, file);
    const sql = fs.readFileSync(full, 'utf8');
    let statements;
    try {
      statements = parseMigrationSql(sql, file);
    } catch (e) {
      problems.push(e.message);
      continue;
    }
    const transactional = !NO_TX_MARKER.test(sql);
    if (!statements.length) problems.push(`${file}: contains no SQL`);
    if (!transactional && statements.length !== 1) problems.push(`${file}: a "-- migrate:no-transaction" migration must contain exactly one statement (it has ${statements.length})`);
    const snapshotFile = path.join(dir, file.replace(/\.sql$/, '.schema.json'));
    out.push({
      version: m[1],
      name: m[2],
      file,
      path: full,
      sql,
      statements,
      checksum: checksum(sql),
      transactional,
      snapshotPath: fs.existsSync(snapshotFile) ? snapshotFile : null,
      snapshotPin: SNAPSHOT_PIN.exec(sql)?.[1] ?? null,
    });
  }
  const seen = new Map();
  for (const mig of out) {
    if (seen.has(mig.version)) problems.push(`duplicate version ${mig.version}: ${seen.get(mig.version)} and ${mig.file}`);
    seen.set(mig.version, mig.file);
  }
  if (problems.length) throw new MigrationError(`Invalid migration files:\n  - ${problems.join('\n  - ')}`);
  return out.sort((a, b) => a.version.localeCompare(b.version));
}

/** A new migration file name for "create": UTC timestamp + snake_case name. */
export function newMigrationFileName(rawName, now = new Date()) {
  const name = String(rawName ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (!name) throw new MigrationError('Give the migration a name, e.g. npm run db:migration:create -- add_course_tags');
  const p = (n, l = 2) => String(n).padStart(l, '0');
  const v = `${now.getUTCFullYear()}${p(now.getUTCMonth() + 1)}${p(now.getUTCDate())}${p(now.getUTCHours())}${p(now.getUTCMinutes())}${p(now.getUTCSeconds())}`;
  return `${v}_${name}.sql`;
}

export const MIGRATION_TEMPLATE = (file) => `-- ${file}
-- What this changes and why:
--
-- Rules (database/README.md):
--   * no BEGIN/COMMIT/END/ROLLBACK/SAVEPOINT: the runner runs this whole file in one transaction and refuses
--     transaction control. Only for one statement that cannot run in a transaction (e.g. CREATE INDEX
--     CONCURRENTLY), put that statement alone in a file with a line reading exactly "-- migrate:no-transaction";
--   * never edit this file after it has been applied anywhere shared; write a new migration instead;
--   * prefer additive changes; anything that drops or rewrites data needs a backup and explicit approval;
--   * committing this file does NOT apply it to production.

`;

/** The pinned expected snapshot of a migration, verified against its SHA-256 pin. */
export function loadPinnedSnapshot(m) {
  if (!m.snapshotPath) throw new MigrationError(`${m.file} has no ${m.file.replace(/\.sql$/, '.schema.json')}; a migration can only be baselined against a pinned expected schema.`);
  if (!m.snapshotPin) throw new MigrationError(`${m.file} has no "-- schema-snapshot-sha256: <hex>" line pinning its expected schema.`);
  const raw = fs.readFileSync(m.snapshotPath, 'utf8');
  const actualSha = checksum(raw);
  if (actualSha !== m.snapshotPin) {
    throw new MigrationError(`${path.basename(m.snapshotPath)} does not match the SHA-256 pinned in ${m.file} (pinned ${m.snapshotPin.slice(0, 12)}…, file ${actualSha.slice(0, 12)}…). Refusing to baseline.`);
  }
  let snap;
  try {
    snap = JSON.parse(raw);
    validateSnapshot(snap, m.version);
  } catch (e) {
    throw new MigrationError(`${path.basename(m.snapshotPath)} is not a valid schema snapshot: ${e.message}`);
  }
  return { snapshot: snap, sha256: actualSha };
}

// ---------------------------------------------------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------------------------------------------------

const HISTORY_DDL = `
CREATE TABLE IF NOT EXISTS ${HISTORY} (
  "version"         varchar(14)  PRIMARY KEY,
  "name"            varchar(200) NOT NULL,
  "checksum"        char(64)     NOT NULL,
  "method"          varchar(10)  NOT NULL CHECK ("method" IN ('applied', 'baseline')),
  "snapshot_sha256" char(64)     NULL,
  "applied_at"      timestamptz  NOT NULL DEFAULT now(),
  "applied_by"      text         NOT NULL DEFAULT current_user,
  "execution_ms"    integer      NULL
)`;

const ext = (text, values = []) => ({ text, values, queryMode: 'extended' });

async function historyExists(client) {
  const r = await client.query(`SELECT to_regclass('public.schema_migrations') IS NOT NULL AS present`);
  return r.rows[0].present;
}

async function readHistory(client) {
  if (!(await historyExists(client))) return null;
  const r = await client.query(`SELECT "version", "name", "checksum", "method", "applied_at", "applied_by", "execution_ms" FROM ${HISTORY} ORDER BY "version"`);
  return r.rows;
}

/**
 * Applied / pending / changed / unknown, without writing anything (runs in a READ ONLY transaction, so even a bug
 * here could not change the database).
 */
export async function status(client, migrations) {
  await client.query('BEGIN TRANSACTION READ ONLY');
  try {
    const history = await readHistory(client);
    return summarise(migrations, history);
  } finally {
    await client.query('ROLLBACK');
  }
}

export function summarise(migrations, history) {
  const byVersion = new Map((history ?? []).map((h) => [h.version, h]));
  const rows = migrations.map((m) => {
    const h = byVersion.get(m.version);
    if (!h) return { ...m, state: 'pending' };
    return { ...m, state: h.checksum.trim() === m.checksum ? h.method : 'changed', history: h };
  });
  const known = new Set(migrations.map((m) => m.version));
  const unknown = (history ?? []).filter((h) => !known.has(h.version));
  return { historyTable: history !== null, rows, unknown, pending: rows.filter((r) => r.state === 'pending'), changed: rows.filter((r) => r.state === 'changed') };
}

function assertConsistent(summary) {
  if (summary.changed.length) {
    throw new MigrationError(
      `Applied migration file(s) were edited after being applied: ${summary.changed.map((r) => r.file).join(', ')}. ` +
        'Restore the original file and put the change in a new migration.',
    );
  }
  if (summary.unknown.length) {
    throw new MigrationError(`The database has applied migrations that are not in this checkout: ${summary.unknown.map((h) => h.version).join(', ')}. Update your code first.`);
  }
}

/** The error with the failing file line, from PostgreSQL's 1-based position within the failing statement. */
export function describeSqlError(err, sql, statement) {
  const parts = [err.message];
  if (err.code) parts.push(`SQLSTATE ${err.code}`);
  if (sql && statement) {
    const offset = statement.offset + (err.position ? Number(err.position) - 1 : 0);
    const line = sql.slice(0, offset).split('\n').length;
    parts.push(`at line ${line}: ${sql.split('\n')[line - 1]?.trim()}`);
  }
  if (err.detail) parts.push(`detail: ${err.detail}`);
  if (err.hint) parts.push(`hint: ${err.hint}`);
  return parts.join(' — ');
}

/**
 * Under the lock: is this version recorded? A recorded version whose checksum differs from the local file is an
 * error, never a silent skip.
 */
async function recordedState(client, m) {
  const r = await client.query(ext(`SELECT "checksum" FROM ${HISTORY} WHERE "version" = $1`, [m.version]));
  if (!r.rowCount) return 'absent';
  if (r.rows[0].checksum.trim() !== m.checksum) {
    throw new MigrationError(`${m.file} is recorded with a different checksum (${r.rows[0].checksum.slice(0, 12)}…) than the local file (${m.checksum.slice(0, 12)}…). Refusing to continue.`);
  }
  return 'recorded';
}

async function record(client, m, method, ms, snapshotSha = null) {
  await client.query(ext(`INSERT INTO ${HISTORY} ("version", "name", "checksum", "method", "snapshot_sha256", "execution_ms") VALUES ($1, $2, $3, $4, $5, $6)`, [m.version, m.name, m.checksum, method, snapshotSha, ms]));
}

/**
 * Applies pending migrations in order. Stops at the first failure (that migration is rolled back and not recorded).
 * options: { dryRun, lockTimeoutMs, statementTimeoutMs, log, target }
 */
export async function run(client, migrations, { dryRun = false, lockTimeoutMs = 5000, statementTimeoutMs = 300000, log = () => {}, target = null } = {}) {
  const before = await status(client, migrations);
  assertConsistent(before);
  if (dryRun) {
    log(before.pending.length ? `Would apply ${before.pending.length} migration(s), in this order:` : 'Nothing to apply.');
    for (const m of before.pending) log(`  ${m.file}  (${m.statements.length} statement(s)${m.transactional ? '' : ', no transaction'})  sha256 ${m.checksum.slice(0, 12)}`);
    if (!before.historyTable && before.pending.length) log('The history table public.schema_migrations would be created in the first migration\'s transaction.');
    return { applied: [], skipped: [], pending: before.pending.map((m) => m.file) };
  }
  const applied = [];
  const skipped = [];
  for (const m of before.pending) {
    const result = m.transactional ? await applyInTransaction(client, m, { lockTimeoutMs, statementTimeoutMs }) : await applyWithoutTransaction(client, m, { lockTimeoutMs, statementTimeoutMs, target });
    if (result === 'skipped') {
      skipped.push(m.file);
      log(`- ${m.file}: already applied by another runner (same checksum), skipped`);
    } else {
      applied.push(m.file);
      log(`✔ ${m.file} (${result} ms)`);
    }
  }
  return { applied, skipped, pending: [] };
}

async function applyInTransaction(client, m, { lockTimeoutMs, statementTimeoutMs }) {
  const started = Date.now();
  let current = null;
  await client.query('BEGIN');
  try {
    await client.query(`SET LOCAL lock_timeout = ${Number(lockTimeoutMs)}`);
    await client.query(`SET LOCAL statement_timeout = ${Number(statementTimeoutMs)}`);
    await client.query(ext('SELECT pg_advisory_xact_lock($1::bigint)', [LOCK_KEY])); // held until COMMIT/ROLLBACK
    await client.query(HISTORY_DDL); // inside this transaction: rolled back too if the migration fails
    if ((await recordedState(client, m)) === 'recorded') {
      await client.query('ROLLBACK');
      return 'skipped';
    }
    const xid = (await client.query('SELECT txid_current()::text AS x')).rows[0].x;
    for (const s of m.statements) {
      current = s;
      await client.query(ext(s.text)); // extended protocol: PostgreSQL rejects more than one statement here
    }
    current = null;
    // belt and braces: the whole migration must still be inside the transaction we opened
    const still = (await client.query('SELECT txid_current_if_assigned()::text AS x')).rows[0].x;
    if (still !== xid) throw new MigrationError(`${m.file} ended the runner's transaction; nothing was recorded. Inspect the schema before retrying.`);
    const ms = Date.now() - started;
    await record(client, m, 'applied', ms);
    await client.query('COMMIT');
    return ms;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err instanceof MigrationError) throw err;
    throw new MigrationError(`${m.file} failed and was rolled back; nothing from it was kept or recorded. ${describeSqlError(err, m.sql, current)}`);
  }
}

async function applyWithoutTransaction(client, m, { lockTimeoutMs, statementTimeoutMs, target }) {
  // a session lock is meaningless through a transaction-mode pooler (each statement may use another connection)
  if (target && target.port === 6543) {
    throw new MigrationError(`${m.file} runs without a transaction and needs a direct or session-mode connection; port 6543 is Supabase's transaction pooler. Set MIGRATION_DATABASE_URL to the direct (5432) connection.`);
  }
  const started = Date.now();
  await client.query(`SET lock_timeout = ${Number(lockTimeoutMs)}`);
  await client.query(`SET statement_timeout = ${Number(statementTimeoutMs)}`);
  await client.query(ext('SELECT pg_advisory_lock($1::bigint)', [LOCK_KEY]));
  try {
    if ((await historyExists(client)) && (await recordedState(client, m)) === 'recorded') return 'skipped';
    try {
      await client.query(ext(m.statements[0].text));
    } catch (err) {
      throw new MigrationError(
        `${m.file} (no transaction) FAILED and was NOT recorded. It may have left partial state (e.g. an INVALID index); ` +
          `inspect the schema before retrying (database/README.md, "A migration failed"). ${describeSqlError(err, m.sql, m.statements[0])}`,
      );
    }
    const ms = Date.now() - started;
    await client.query('BEGIN');
    try {
      await client.query(HISTORY_DDL);
      if ((await recordedState(client, m)) === 'absent') await record(client, m, 'applied', ms);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err instanceof MigrationError ? err : new MigrationError(`${m.file} ran but could not be recorded: ${describeSqlError(err)}`);
    }
    return ms;
  } finally {
    await client.query(ext('SELECT pg_advisory_unlock($1::bigint)', [LOCK_KEY])).catch(() => {});
    await client.query('RESET lock_timeout').catch(() => {});
    await client.query('RESET statement_timeout').catch(() => {});
  }
}

const fingerprint = (verified) => checksum(JSON.stringify(verified));

/**
 * Records an already-applied migration WITHOUT running it, only when the live schema matches the migration's pinned
 * expected snapshot exactly.
 *   1. The snapshot file must match the SHA-256 pinned in the migration file (loadPinnedSnapshot).
 *   2. Verification: built-in catalogue SELECTs (schema-snapshot.mjs) inside BEGIN TRANSACTION READ ONLY, compared
 *      with the snapshot. Any difference = refusal, nothing written.
 *   3. dryRun stops here.
 *   4. Recording (one write transaction): advisory lock; ACCESS SHARE locks on the tables (blocks concurrent DDL, not
 *      normal reads/writes); the same built-in SELECTs re-read the catalogue only to confirm nothing changed since
 *      step 2 (fingerprint must be identical); history table created if needed; one INSERT; COMMIT. On any failure
 *      everything — including a newly created history table — is rolled back.
 */
export async function baseline(client, migrations, version, { dryRun = false, lockTimeoutMs = 5000, log = () => {} } = {}) {
  const m = migrations.find((x) => x.version === version || x.file === version);
  if (!m) throw new MigrationError(`No migration ${version} in database/migrations.`);
  const { snapshot, sha256 } = loadPinnedSnapshot(m);

  const before = await status(client, migrations);
  assertConsistent(before);
  const row = before.rows.find((r) => r.version === m.version);
  if (row.state !== 'pending') throw new MigrationError(`${m.file} is already recorded (${row.state}).`);
  const earlier = before.pending.filter((p) => p.version < m.version);
  if (earlier.length) throw new MigrationError(`Earlier migrations are still pending (${earlier.map((p) => p.file).join(', ')}); apply or baseline them first.`);

  let live;
  await client.query('BEGIN TRANSACTION READ ONLY');
  try {
    live = await readSchema(client, snapshot.tableNames);
  } finally {
    await client.query('ROLLBACK');
  }
  const problems = compareSchema(snapshot.verified, live.verified);
  const versionNote =
    live.serverVersionNum !== snapshot.generatedOnServerVersionNum
      ? `Snapshot generated on PostgreSQL ${snapshot.generatedOnServerVersionNum}, this server is ${live.serverVersionNum}. Differences that are only in how a version prints an expression must be reviewed and added as "alternatives" in the snapshot (which changes its pinned checksum).`
      : null;
  if (dryRun) {
    log(problems.length ? `Schema does NOT match ${m.file} (${problems.length} problem(s)); it cannot be baselined:` : `Schema matches ${m.file} (snapshot sha256 ${sha256.slice(0, 12)}…); "baseline" would record it as applied (method "baseline") without running it.`);
    for (const p of problems.slice(0, 100)) log(`  - ${p}`);
    if (problems.length && versionNote) log(versionNote);
    log(`Not verified (reported only): ${live.reported.rls.map((r) => `${r.table} rls=${r.rls}${r.force_rls ? ' (forced)' : ''}`).join(', ')}; policies: ${live.reported.policies.length ? live.reported.policies.map((p) => `${p.table}.${p.name}`).join(', ') : 'none'}.`);
    return { ok: problems.length === 0, problems };
  }
  if (problems.length) {
    throw new MigrationError(`Schema does NOT match ${m.file}; nothing was recorded:\n  - ${problems.slice(0, 100).join('\n  - ')}${versionNote ? `\n${versionNote}` : ''}`);
  }

  await client.query('BEGIN');
  try {
    await client.query(`SET LOCAL lock_timeout = ${Number(lockTimeoutMs)}`);
    await client.query(ext('SELECT pg_advisory_xact_lock($1::bigint)', [LOCK_KEY]));
    await client.query(`LOCK TABLE ${snapshot.tableNames.map((t) => `"public"."${t}"`).join(', ')} IN ACCESS SHARE MODE`);
    const again = await readSchema(client, snapshot.tableNames);
    if (fingerprint(again.verified) !== fingerprint(live.verified)) throw new MigrationError(`The schema of ${m.file}'s tables changed during the baseline; nothing was recorded. Run it again.`);
    await client.query(HISTORY_DDL);
    if ((await recordedState(client, m)) === 'recorded') throw new MigrationError(`${m.file} was recorded by another runner meanwhile.`);
    await record(client, m, 'baseline', null, sha256);
    await client.query('COMMIT');
    log(`✔ ${m.file} recorded as baseline (verified against snapshot ${sha256.slice(0, 12)}…, not executed)`);
    return { ok: true, problems: [] };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err instanceof MigrationError ? err : new MigrationError(`Baseline failed and nothing was recorded: ${describeSqlError(err)}`);
  }
}
