#!/usr/bin/env node
// scripts/db/migrate.mjs — command line for the GleamLearn migration runner (core: scripts/db/migrator.mjs).
//
//   npm run db:migration:status                                         read-only
//   npm run db:migration:run -- --dry-run                               read-only: the plan
//   npm run db:migration:run -- --confirm-target=<db>@<host>:<port>     apply pending migrations (ANY database)
//   npm run db:migration:baseline -- <version> --dry-run                read-only: compare with the pinned snapshot
//   npm run db:migration:baseline -- <version> --confirm-target=<db>@<host>:<port>   record a verified migration
//   npm run db:migration:create -- <name>                               new empty migration file (no database)
//
// Order of checks: arguments (strict, cli-args.mjs) → configuration and target (validated, no connection) →
// for writes, --confirm-target must equal the resolved <database>@<host>:<port> → connect (TLS verified for any
// non-local host) → the server's current_database() must equal the resolved database → the command.
// Exit codes: 0 ok; 1 failure; 2 usage/configuration/connection error; 3 status or a dry run found something to act on.
// It never prints passwords or connection strings. It is never run by "npm run build" or by the API at start-up.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { USAGE, UsageError, parseCli } from './cli-args.mjs';
import {
  MIGRATION_TEMPLATE,
  MigrationError,
  assertConnectedTarget,
  baseline,
  confirmationFor,
  describeTarget,
  discoverMigrations,
  loadEnvironment,
  newMigrationFileName,
  resolveTarget,
  run,
  status,
} from './migrator.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = (s = '') => process.stdout.write(`${s}\n`);
const fail = (msg, code = 1) => {
  process.stderr.write(`\n✖ ${msg}\n`);
  process.exit(code);
};

let cli;
try {
  cli = parseCli(process.argv.slice(2));
} catch (e) {
  if (e instanceof UsageError) fail(`${e.message}\n\n${USAGE}`, 2);
  throw e;
}
const { command, positionals, options, write } = cli;
const dir = path.resolve(ROOT, options.dir || 'database/migrations');
const intOpt = (name, dflt) => (options[name] === undefined ? dflt : Number(options[name]));

function target() {
  try {
    const env = loadEnvironment({ envFile: options['target-env-file'] && path.resolve(options['target-env-file']), explicit: Boolean(options['target-env-file']), defaultFile: path.join(ROOT, '.env') });
    return resolveTarget(env, { strict: Boolean(options['strict-target']) });
  } catch (e) {
    return fail(e instanceof MigrationError ? e.message : `Configuration error: ${e.message}`, 2);
  }
}

async function withClient(fn) {
  const t = target();
  out(`Database: ${describeTarget(t)}${options['target-env-file'] ? ` [target variables only from ${options['target-env-file']}]` : ''}`);
  if (write) {
    // every write, local or remote, names the resolved target exactly — checked BEFORE any connection
    const want = confirmationFor(t);
    if (options['confirm-target'] !== want) {
      fail(`--confirm-target does not match the resolved target. It must be exactly --confirm-target=${want} (you gave "${options['confirm-target']}"). Nothing was contacted.`, 2);
    }
  }
  const client = new pg.Client({ ...t.options, application_name: 'gleamlearn-migrate', connectionTimeoutMillis: 15000 });
  try {
    await client.connect();
  } catch (e) {
    // pg's message names host/user, never the password
    fail(`Could not connect: ${e.code ? `${e.code} ` : ''}${e.message}${t.local ? '' : ' (TLS certificates are verified; for Supabase set MIGRATION_DATABASE_SSL_ROOT_CERT to the project CA file)'}`, 2);
  }
  try {
    await assertConnectedTarget(client, t);
    return await fn(client, t);
  } finally {
    await client.end().catch(() => {});
  }
}

const migrations = () => {
  try {
    return discoverMigrations(dir);
  } catch (e) {
    return fail(e.message, 2);
  }
};

async function main() {
  switch (command) {
    case 'status': {
      const list = migrations();
      await withClient(async (client) => {
        const s = await status(client, list);
        if (!s.historyTable) out('History table public.schema_migrations does not exist yet (nothing has been applied through the runner).');
        out('');
        for (const r of s.rows) out(`  ${r.state.padEnd(8)} ${r.file}${r.history ? `  ${new Date(r.history.applied_at).toISOString()}` : ''}`);
        for (const u of s.unknown) out(`  unknown  ${u.version}_${u.name} (in the database, not in this checkout)`);
        if (!list.length) out('  (no migration files)');
        out('');
        out(`${s.rows.length - s.pending.length - s.changed.length} recorded, ${s.pending.length} pending, ${s.changed.length} edited after applying, ${s.unknown.length} unknown.`);
        if (s.changed.length || s.unknown.length || s.pending.length) process.exitCode = 3;
      });
      return;
    }
    case 'run': {
      const list = migrations();
      await withClient(async (client, t) => {
        const r = await run(client, list, { dryRun: !write, lockTimeoutMs: intOpt('lock-timeout-ms', 5000), statementTimeoutMs: intOpt('statement-timeout-ms', 300000), log: out, target: t });
        if (write) out(`\nDone: ${r.applied.length} applied, ${r.skipped.length} skipped (already applied by another runner).`);
        else out('\nDry run: nothing was changed.');
      });
      return;
    }
    case 'baseline': {
      const list = migrations();
      await withClient(async (client) => {
        const r = await baseline(client, list, positionals[0], { dryRun: !write, lockTimeoutMs: intOpt('lock-timeout-ms', 5000), log: out });
        if (!write && !r.ok) process.exitCode = 3;
      });
      return;
    }
    case 'create': {
      let file;
      try {
        file = newMigrationFileName(positionals.join('_'));
      } catch (e) {
        fail(e.message, 2);
      }
      fs.mkdirSync(dir, { recursive: true });
      const full = path.join(dir, file);
      if (fs.existsSync(full)) fail(`${file} already exists`, 2);
      fs.writeFileSync(full, MIGRATION_TEMPLATE(file));
      out(`Created ${path.relative(ROOT, full)}. Write the SQL, review it, test it locally (npm run db:migration:run -- --dry-run, then with --confirm-target). Committing it does NOT apply it to production.`);
      return;
    }
  }
}

main().catch((e) => fail(e instanceof MigrationError ? e.message : `Unexpected error: ${e.message}`));
