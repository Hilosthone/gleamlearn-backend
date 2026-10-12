// Starts the compiled backend (dist/main.js) against the DISPOSABLE local e2e database.
// Overrides (process env beats .env in @nestjs/config):
//   - TypeORM + Prisma → database "gleamlearn_e2e" on the same LOCAL server (refuses non-local hosts)
//   - DB_SYNCHRONIZE=true (only for this disposable database)
//   - SMTP → local sink on 127.0.0.1:2525 with dummy credentials (no real mail is sent)
//   - AI_SERVICE_URL → local AI service (no remote/production AI calls)
// Never prints secrets. Run from the backend repo root.
import fs from 'fs';
import { spawn } from 'child_process';

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8').split(/\r?\n/).filter((l) => l && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
);
const host = env.DATABASE_HOST || 'localhost';
if (!['localhost', '127.0.0.1', '::1'].includes(host)) { console.log('REFUSING: database host is not local'); process.exit(2); }
if ((env.DATABASE_URL || '').includes('supabase.co')) { console.log('REFUSING: DATABASE_URL points at a hosted database'); process.exit(2); }

const port = env.DATABASE_PORT || '5432';
const user = encodeURIComponent(env.DATABASE_USER || 'postgres');
const pass = encodeURIComponent(env.DATABASE_PASSWORD || 'postgres');
const overrides = {
  NODE_ENV: 'development',
  PORT: process.env.E2E_BACKEND_PORT || '5055',
  DATABASE_HOST: host,
  DATABASE_NAME: 'gleamlearn_e2e',
  DATABASE_URL: `postgresql://${user}:${pass}@${host}:${port}/gleamlearn_e2e`,
  DB_SYNCHRONIZE: 'true',
  SMTP_HOST: '127.0.0.1',
  SMTP_PORT: '2525',
  SMTP_USER: 'e2e',
  SMTP_PASS: 'e2e',
  AI_SERVICE_URL: process.env.E2E_AI_URL || 'http://127.0.0.1:8765',
  FRONTEND_URL: 'http://localhost:3000',
};
const child = spawn(process.execPath, ['dist/main.js'], { env: { ...process.env, ...overrides }, stdio: ['ignore', 'pipe', 'pipe'] });
const log = fs.createWriteStream(process.argv[2] || (process.env.TEMP || '/tmp') + '/gleamlearn-e2e-backend.log');
child.stdout.pipe(log);
child.stderr.pipe(log);
child.on('exit', (code) => { log.write(`\n[exit ${code}]\n`); process.exit(code ?? 0); });
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill());
