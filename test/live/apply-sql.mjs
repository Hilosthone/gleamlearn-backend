// Applies a proposed migration file to the DISPOSABLE local database "gleamlearn_e2e" only.
// Refuses non-local hosts and hosted databases. Never prints credentials.
// Usage (from the backend repo): node test/live/apply-sql.mjs docs/migrations/proposed/<file>.sql
import { createRequire } from 'module';
import fs from 'fs';

const file = process.argv[2];
if (!file || !fs.existsSync(file)) { console.log('usage: node test/live/apply-sql.mjs <file.sql>'); process.exit(2); }
const pg = createRequire(process.cwd() + '/package.json')('pg');
const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8').split(/\r?\n/).filter((l) => l && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
);
const host = env.DATABASE_HOST || 'localhost';
if (!['localhost', '127.0.0.1', '::1'].includes(host)) { console.log('REFUSING: database host is not local'); process.exit(2); }
if ((env.DATABASE_URL || '').includes('supabase.co')) { console.log('REFUSING: DATABASE_URL points at a hosted database'); process.exit(2); }

const client = new pg.Client({ host, port: +(env.DATABASE_PORT || 5432), user: env.DATABASE_USER || 'postgres', password: env.DATABASE_PASSWORD || 'postgres', database: 'gleamlearn_e2e' });
await client.connect();
try {
  await client.query(fs.readFileSync(file, 'utf8'));
  console.log(`applied ${file} to gleamlearn_e2e`);
} finally {
  await client.end();
}
