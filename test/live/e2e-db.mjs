// Creates (or reports) the DISPOSABLE e2e database "gleamlearn_e2e" on the LOCAL Postgres server.
// Refuses to run against a non-local host. Never prints credentials. Never touches the existing database.
// Usage (from the backend repo): node test/live/e2e-db.mjs create | drop | recreate | status
import { createRequire } from 'module';
import fs from 'fs';
const pg = createRequire(process.cwd() + '/package.json')('pg');
const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8').split(/\r?\n/).filter((l) => l && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
);
const E2E_DB = 'gleamlearn_e2e';
const host = env.DATABASE_HOST || 'localhost';
if (!['localhost', '127.0.0.1', '::1'].includes(host)) { console.log('REFUSING: database host is not local'); process.exit(2); }
if ((env.DATABASE_NAME || 'mycoursea_db') === E2E_DB) { console.log('REFUSING: e2e name equals the configured database'); process.exit(2); }
const client = new pg.Client({ host, port: +(env.DATABASE_PORT || 5432), user: env.DATABASE_USER || 'postgres', password: env.DATABASE_PASSWORD || 'postgres', database: 'postgres', connectionTimeoutMillis: 5000 });
const action = process.argv[2] || 'status';
try {
  await client.connect();
  const exists = (await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [E2E_DB])).rowCount > 0;
  if (action === 'create' && !exists) { await client.query(`CREATE DATABASE "${E2E_DB}"`); console.log('created', E2E_DB); }
  else if (action === 'recreate') { if (exists) await client.query(`DROP DATABASE "${E2E_DB}" WITH (FORCE)`); await client.query(`CREATE DATABASE "${E2E_DB}"`); console.log('recreated', E2E_DB); }
  else if (action === 'drop' && exists) { await client.query(`DROP DATABASE "${E2E_DB}" WITH (FORCE)`); console.log('dropped', E2E_DB); }
  else console.log(E2E_DB, exists ? 'exists' : 'absent');
} catch (e) { console.log('error:', e.code || e.message); process.exitCode = 1; }
finally { await client.end().catch(() => {}); }
