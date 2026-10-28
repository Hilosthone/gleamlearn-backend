#!/usr/bin/env node
// scripts/db/make-snapshot.mjs — writes <migration>.schema.json, the expected schema that "baseline" requires.
//
//   npm run db:migration:make-snapshot -- <version> <table> [<table> …]
//
// Creates a throw-away LOCAL database, applies every migration up to and including <version> with the real runner,
// reads the listed tables with the same built-in catalogue queries "baseline" uses, drops the throw-away database,
// writes the JSON, and prints the line to pin it in the migration file:
//     -- schema-snapshot-sha256: <hex>
// Pinning edits the migration file, which changes its checksum: do it only BEFORE the migration is applied anywhere
// shared. Refuses any non-local host. Never prints credentials.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { checksum, discoverMigrations, loadEnvironment, resolveTarget, run } from './migrator.mjs';
import { NOT_VERIFIED, SNAPSHOT_FORMAT, readSchema } from './schema-snapshot.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
if (args.some((a) => a.startsWith('-'))) {
  console.error('This command takes no options.');
  process.exit(2);
}
const [version, ...tables] = args;
if (!version || !tables.length || !tables.every((t) => /^[a-z_][a-z0-9_]*$/.test(t)) || new Set(tables).size !== tables.length) {
  console.error('Usage: npm run db:migration:make-snapshot -- <version> <table> [<table> …] (lower_snake table names, no duplicates)');
  process.exit(2);
}
const dir = path.join(ROOT, 'database/migrations');
const all = discoverMigrations(dir);
const target = all.find((m) => m.version === version);
if (!target) {
  console.error(`No migration ${version}`);
  process.exit(2);
}
const t = resolveTarget(loadEnvironment({ defaultFile: path.join(ROOT, '.env') }));
if (!t.local || t.options.connectionString) {
  console.error('REFUSING: needs a local DATABASE_HOST configuration (this tool creates and drops a scratch database).');
  process.exit(2);
}
const scratch = `gleamlearn_snapshot_${Date.now().toString(36)}`;
const admin = new pg.Client({ ...t.options, database: 'postgres' });
await admin.connect();
await admin.query(`CREATE DATABASE ${scratch}`);
try {
  const c = new pg.Client({ ...t.options, database: scratch });
  await c.connect();
  try {
    await run(c, all.filter((m) => m.version <= version));
    await c.query('BEGIN TRANSACTION READ ONLY');
    const live = await readSchema(c, tables);
    await c.query('ROLLBACK');
    const missing = tables.filter((tb) => !live.verified.tables.some((r) => r.table === tb));
    if (missing.length) throw new Error(`Migration ${version} does not create: ${missing.join(', ')}`);
    const snapshot = {
      format: SNAPSHOT_FORMAT,
      migration: version,
      generatedBy: 'scripts/db/make-snapshot.mjs',
      generatedOnServerVersionNum: live.serverVersionNum,
      tableNames: tables,
      notVerified: NOT_VERIFIED,
      verified: live.verified,
    };
    const json = `${JSON.stringify(snapshot, null, 2)}\n`;
    const out = path.join(dir, target.file.replace(/\.sql$/, '.schema.json'));
    fs.writeFileSync(out, json);
    const v = live.verified;
    console.log(`Wrote ${path.relative(ROOT, out)}: ${v.tables.length} tables, ${v.columns.length} columns, ${v.indexes.length} indexes, ${v.constraints.length} constraints, ${v.triggers.length} user triggers.`);
    console.log(`Pin it in ${target.file} (before it is applied anywhere shared):\n-- schema-snapshot-sha256: ${checksum(json)}`);
  } finally {
    await c.end();
  }
} finally {
  await admin.query(`DROP DATABASE IF EXISTS ${scratch} WITH (FORCE)`); // only the scratch database created above
  await admin.end();
}
