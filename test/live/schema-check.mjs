// READ-ONLY schema check: compares the columns declared by the TypeORM entities with the real database tables.
// Prints column NAMES only (never values or credentials). Runs inside a READ ONLY transaction and rolls back.
//
// Usage (from the backend repo):
//   node test/live/schema-check.mjs                       # the database configured in .env (DATABASE_HOST/…)
//   SCHEMA_CHECK_URL='postgres://…' node test/live/schema-check.mjs   # any database, e.g. production (read-only user recommended)
//   SCHEMA_CHECK_SSL=1 …                                   # add TLS (hosted databases such as Render/Supabase)
import fs from 'fs';
import { createRequire } from 'module';

const pg = createRequire(process.cwd() + '/package.json')('pg');
const env = fs.existsSync('.env')
  ? Object.fromEntries(
      fs.readFileSync('.env', 'utf8').split(/\r?\n/).filter((l) => l && !l.trim().startsWith('#') && l.includes('='))
        .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
    )
  : {};

/** Columns an entity file declares (active code only), using the explicit `name:` when present. */
function entityColumns(file) {
  const src = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => !l.trim().startsWith('//')).join('\n');
  const tableMatch = src.match(/@Entity\(\s*'([^']+)'/);
  const cols = [];
  const re = /@(Column|CreateDateColumn|UpdateDateColumn|DeleteDateColumn|PrimaryGeneratedColumn|PrimaryColumn)\(([^)]*)\)\s*(\w+)[?!]?\s*:/g;
  for (let m; (m = re.exec(src)); ) {
    const named = m[2].match(/name:\s*'([^']+)'/);
    cols.push(named ? named[1] : m[3]);
  }
  return { table: tableMatch?.[1], cols };
}

const ENTITIES = [
  ['auth User (used by sign-up, login, password reset)', 'src/auth/entities/user.entity.ts'],
  ['users-module User', 'src/users/users.entity.ts'],
  ['Admin', 'src/admin/auth/entity/admin.entity.ts'],
];

const url = process.env.SCHEMA_CHECK_URL;
const ssl = process.env.SCHEMA_CHECK_SSL ? { rejectUnauthorized: false } : undefined;
const client = new pg.Client(
  url
    ? { connectionString: url, ssl, connectionTimeoutMillis: 15000 }
    : {
        host: env.DATABASE_HOST || 'localhost', port: +(env.DATABASE_PORT || 5432), user: env.DATABASE_USER || 'postgres',
        password: env.DATABASE_PASSWORD || 'postgres', database: process.env.SCHEMA_CHECK_DB || env.DATABASE_NAME || 'mycoursea_db', connectionTimeoutMillis: 15000,
      },
);

try {
  await client.connect();
  await client.query('BEGIN READ ONLY');
  console.log(`database: ${url ? 'SCHEMA_CHECK_URL' : '.env DATABASE_* (' + (process.env.SCHEMA_CHECK_DB || env.DATABASE_NAME || 'mycoursea_db') + ')'}`);
  let problems = 0;
  for (const [label, file] of ENTITIES) {
    if (!fs.existsSync(file)) continue;
    const { table, cols } = entityColumns(file);
    const res = await client.query('SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1', [table]);
    const dbCols = new Set(res.rows.map((r) => r.column_name));
    const missing = cols.filter((c) => !dbCols.has(c));
    console.log(`\n${label} → table "${table}": ${dbCols.size ? `${cols.length} declared, ${missing.length} missing` : 'TABLE NOT FOUND'}`);
    if (missing.length) {
      problems++;
      console.log(`  MISSING columns (every query through this entity fails with "column … does not exist"): ${missing.join(', ')}`);
    }
  }
  console.log(problems ? '\nRESULT: schema mismatch found (see MISSING above).' : '\nRESULT: all declared columns exist.');
  await client.query('ROLLBACK');
  process.exitCode = problems ? 2 : 0;
} catch (e) {
  console.log('could not check:', e.code || e.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
