// test/live/migrator-live.mjs — end-to-end checks of the migration runner (scripts/db/migrate.mjs) against the LOCAL
// PostgreSQL server. Every scenario uses its own throw-away database (created and dropped here); nothing else is
// touched. Refuses non-local hosts. Never prints credentials.
// Usage (from the backend repo): node test/live/migrator-live.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import pg from 'pg';
import { confirmationFor, loadEnvironment, resolveTarget } from '../../scripts/db/migrator.mjs';

const ROOT = process.cwd();
const base = resolveTarget(loadEnvironment({ defaultFile: path.join(ROOT, '.env') }));
if (!base.local || base.options.connectionString) {
  console.log('REFUSING: needs a local DATABASE_HOST configuration');
  process.exit(2);
}
const RUN = Date.now().toString(36);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'migrator-live-'));
const created = [];
let passed = 0;
let failed = 0;
const check = (name, cond, detail = '') => {
  if (cond) passed++;
  else failed++;
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const admin = new pg.Client({ ...base.options, database: 'postgres' });
await admin.connect();
async function scratchDb(label) {
  const name = `gl_mig_${label}_${RUN}`;
  await admin.query(`CREATE DATABASE ${name}`);
  created.push(name);
  const envFile = path.join(tmp, `${name}.env`);
  const o = base.options;
  fs.writeFileSync(envFile, `DATABASE_HOST=${o.host}\nDATABASE_PORT=${o.port}\nDATABASE_USER=${o.user}\nDATABASE_PASSWORD=${o.password}\nDATABASE_NAME=${name}\n`);
  const client = new pg.Client({ ...o, database: name });
  await client.connect();
  const confirm = `--confirm-target=${confirmationFor(resolveTarget(loadEnvironment({ envFile, explicit: true, base: {} })))}`;
  return { name, envFile, client, confirm };
}
/** Runs the real CLI with an explicit --target-env-file (so inherited target variables are ignored), unless noEnvFile. */
function cli(args, { envFile, env: extraEnv = {} } = {}) {
  const env = { ...process.env, ...extraEnv };
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['scripts/db/migrate.mjs', ...args, ...(envFile ? [`--target-env-file=${envFile}`] : [])], { cwd: ROOT, env });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('close', (code) => resolve({ code, out }));
  });
}
const migDir = (label, files) => {
  const d = path.join(tmp, label);
  fs.mkdirSync(d);
  for (const [f, sql] of Object.entries(files)) fs.writeFileSync(path.join(d, f), sql);
  return d;
};
const tables = async (c) => (await c.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1`)).rows.map((r) => r.table_name);
const hasHistory = async (c) => (await c.query(`SELECT to_regclass('public.schema_migrations') IS NOT NULL AS p`)).rows[0].p;
const history = async (c) => ((await hasHistory(c)) ? (await c.query(`SELECT version, method, checksum, snapshot_sha256 FROM public.schema_migrations ORDER BY version`)).rows : []);
const connections = async (dbName) => (await admin.query(`SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = $1 AND application_name = 'gleamlearn-migrate'`, [dbName])).rows[0].n;
const EIGHT = ['assessment_attempts', 'learner_assessments', 'learner_materials', 'learning_resources', 'personal_course_modules', 'personal_courses', 'user_avatars', 'youtube_session_messages'];
const PROD_SCRIPT = fs.readFileSync('docs/migrations/proposed/2026-10-28_PRODUCTION_learner_content_and_self_service.sql', 'utf8');
const PROD_APPLY = PROD_SCRIPT.slice(PROD_SCRIPT.indexOf('\nBEGIN;'), PROD_SCRIPT.indexOf('-- STEP 3'));
const copyRepoMigrations = (label) => {
  const d = path.join(tmp, label);
  fs.cpSync(path.join(ROOT, 'database/migrations'), d, { recursive: true });
  return d;
};

try {
  // A. fresh database: status/dry run read-only; a write needs the exact confirmation; run applies once
  {
    const db = await scratchDb('fresh');
    const st = await cli(['status'], { envFile: db.envFile });
    check('status on an empty database: pending listed, exit 3, nothing created', st.code === 3 && /pending\s+20261028000000_learner_content_and_self_service\.sql/.test(st.out) && (await tables(db.client)).length === 0, `exit ${st.code}`);
    const dry = await cli(['run', '--dry-run'], { envFile: db.envFile });
    check('run --dry-run prints the plan and changes nothing (no history table)', dry.code === 0 && /Would apply 1 migration/.test(dry.out) && (await tables(db.client)).length === 0);
    for (const [label, args] of [
      ['no --confirm-target', ['run']],
      ['--dry-run=true', ['run', '--dry-run=true']],
      ['--dryrun (typo)', ['run', '--dryrun']],
      ['--dry-run with --confirm-target', ['run', '--dry-run', db.confirm]],
      ['wrong --confirm-target', ['run', '--confirm-target=postgres@localhost:5432']],
      ['confirm without port', ['run', `--confirm-target=${db.name}@localhost`]],
    ]) {
      const r = await cli(args, { envFile: db.envFile });
      check(`local write refused for ${label}: exit 2, nothing created`, r.code === 2 && (await tables(db.client)).length === 0, (r.out.match(/✖ ([^\n]*)/) ?? [])[1]?.slice(0, 110));
    }
    const r1 = await cli(['run', db.confirm], { envFile: db.envFile });
    const h = await history(db.client);
    check('run with the exact confirmation applies and records it with its checksum', r1.code === 0 && h.length === 1 && h[0].method === 'applied' && h[0].checksum.length === 64, (r1.out.match(/✔[^\n]*/) ?? [r1.out.slice(-200)])[0]);
    const present = await tables(db.client);
    check('the eight tables exist after run', EIGHT.every((t) => present.includes(t)));
    const r2 = await cli(['run', db.confirm], { envFile: db.envFile });
    check('running again applies nothing (no duplicate)', r2.code === 0 && /0 applied/.test(r2.out) && (await history(db.client)).length === 1);
    const st2 = await cli(['status'], { envFile: db.envFile });
    check('status afterwards: applied, exit 0', st2.code === 0 && /applied\s+20261028000000/.test(st2.out));
    const dryB = await cli(['baseline', '20261028000000', '--dry-run'], { envFile: db.envFile });
    check('baseline on an already-recorded migration is refused', dryB.code === 1 && /already recorded/.test(dryB.out));
    await db.client.end();
  }

  // B. failure: everything from the failing migration rolls back — including a history table created with it
  {
    const db = await scratchDb('failfirst');
    const dir = migDir('failfirst', { '20260101000000_bad.sql': "CREATE TABLE half_done (id int);\nINSERT INTO half_done VALUES (1);\nSELECT 'a;b' AS semicolon_in_string;\nCREATE TABLE broken (\n  id nonsense_type\n);" });
    const r = await cli(['run', `--dir=${dir}`, db.confirm], { envFile: db.envFile });
    check('a failing first migration: exit 1, names the file line, nothing kept, NO history table left', r.code === 1 && /at line 5: id nonsense_type/.test(r.out) && !(await tables(db.client)).length && !(await hasHistory(db.client)), (r.out.match(/✖ ([^\n]*)/) ?? [])[1]?.slice(0, 160));
    await db.client.end();
  }
  {
    const db = await scratchDb('fail');
    const dir = migDir('fail', {
      '20260101000000_good.sql': 'CREATE TABLE good_one (id int);',
      '20260102000000_bad.sql': 'CREATE TABLE half_done (id int);\nCREATE TABLE broken (id nonsense_type);',
      '20260103000000_later.sql': 'CREATE TABLE later_one (id int);',
    });
    const r = await cli(['run', `--dir=${dir}`, db.confirm], { envFile: db.envFile });
    const t = await tables(db.client);
    check('a failing later migration: the earlier one stays, the failing one leaves nothing, the next one does not run', r.code === 1 && t.includes('good_one') && !t.includes('half_done') && !t.includes('later_one') && (await history(db.client)).map((x) => x.version).join() === '20260101000000');
    await db.client.end();
  }

  // C. transaction control in a file is refused before any statement runs
  {
    const db = await scratchDb('txctl');
    for (const [label, sql] of [
      ['two statements on one line', 'CREATE TABLE smuggled (id int); COMMIT;'],
      ['END;', 'CREATE TABLE smuggled (id int);\nEND;'],
      ['COMMIT without semicolon', 'CREATE TABLE smuggled (id int);\nCOMMIT'],
      ['ABORT after a comment', 'CREATE TABLE smuggled (id int);/* x */ABORT;'],
      ['COMMIT AND CHAIN', 'CREATE TABLE smuggled (id int);\ncommit and chain;'],
    ]) {
      const dir = migDir(`txctl_${created.length}_${label.replace(/\W+/g, '_')}`, { '20260101000000_x.sql': sql });
      const r = await cli(['run', `--dir=${dir}`, db.confirm], { envFile: db.envFile });
      check(`transaction control refused (${label}): exit 2, nothing created`, r.code === 2 && /transaction control is not allowed/.test(r.out) && (await tables(db.client)).length === 0);
    }
    const dir = migDir('txctl_ok', { '20260101000000_fn.sql': "CREATE TABLE t (v text);\nINSERT INTO t VALUES ('COMMIT; END;');\nCREATE FUNCTION f() RETURNS int LANGUAGE plpgsql AS $$\nBEGIN\n  RETURN 1;\nEND;\n$$;\nDO $x$ BEGIN PERFORM f(); END $x$;" });
    const r = await cli(['run', `--dir=${dir}`, db.confirm], { envFile: db.envFile });
    check('keywords inside strings, function bodies and DO blocks are allowed and run', r.code === 0 && (await db.client.query('SELECT v FROM t')).rows[0]?.v === 'COMMIT; END;');
    await db.client.end();
  }

  // D. two runners at the same moment: each migration applied exactly once
  {
    const db = await scratchDb('race');
    const dir = migDir('race', { '20260101000000_slow.sql': 'SELECT pg_sleep(1.5);\nCREATE TABLE raced (id int);\nINSERT INTO raced VALUES (1);', '20260102000000_next.sql': 'INSERT INTO raced VALUES (2);' });
    const [a, b] = await Promise.all([cli(['run', `--dir=${dir}`, db.confirm], { envFile: db.envFile }), cli(['run', `--dir=${dir}`, db.confirm], { envFile: db.envFile })]);
    const rows = (await db.client.query('SELECT count(*)::int AS n FROM raced')).rows[0].n;
    check('two concurrent runners: both exit 0, each migration applied once', a.code === 0 && b.code === 0 && rows === 2 && (await history(db.client)).length === 2, [a.out, b.out].map((o) => (o.match(/Done: .*/) ?? [''])[0]).join(' | '));
    await db.client.end();
  }

  // E. checksum race: another runner records the same version with DIFFERENT contents while this one waits
  {
    const db = await scratchDb('checksum');
    const dir1 = migDir('checksum1', { '20260101000000_m.sql': 'SELECT pg_sleep(1.5);\nCREATE TABLE first_version (id int);' });
    const dir2 = migDir('checksum2', { '20260101000000_m.sql': 'CREATE TABLE second_version (id int);' });
    const p1 = cli(['run', `--dir=${dir1}`, db.confirm], { envFile: db.envFile });
    await new Promise((r) => setTimeout(r, 600)); // runner 2 reads "pending" while runner 1 holds the lock
    const r2 = await cli(['run', `--dir=${dir2}`, db.confirm], { envFile: db.envFile });
    const r1 = await p1;
    const t = await tables(db.client);
    check('a recorded migration with a different checksum is an error under the lock, not a silent skip', r1.code === 0 && r2.code === 1 && /recorded with a different checksum/.test(r2.out) && t.includes('first_version') && !t.includes('second_version'), (r2.out.match(/✖ ([^\n]*)/) ?? [])[1]?.slice(0, 120));
    await db.client.end();
  }

  // F. the production situation: tables created MANUALLY, adopted by baseline against the pinned snapshot
  {
    const db = await scratchDb('baseline');
    await db.client.query(PROD_APPLY);
    const runIt = await cli(['run', db.confirm], { envFile: db.envFile });
    check('running the migration where the tables exist FAILS, rolls back, and leaves no history table', runIt.code === 1 && /already exists/.test(runIt.out) && !(await hasHistory(db.client)));
    const dry = await cli(['baseline', '20261028000000', '--dry-run'], { envFile: db.envFile });
    check('baseline --dry-run: schema matches, read-only (no history table), reports RLS/policies as not verified', dry.code === 0 && /Schema matches/.test(dry.out) && /Not verified \(reported only\)/.test(dry.out) && !(await hasHistory(db.client)));
    const noConfirm = await cli(['baseline', '20261028000000'], { envFile: db.envFile });
    check('baseline without --confirm-target is refused (local too)', noConfirm.code === 2 && !(await hasHistory(db.client)));
    const b = await cli(['baseline', '20261028000000', db.confirm], { envFile: db.envFile });
    const h = await history(db.client);
    check('baseline records it as "baseline" with the snapshot checksum, without executing it', b.code === 0 && h.length === 1 && h[0].method === 'baseline' && h[0].snapshot_sha256?.length === 64);
    const again = await cli(['run', db.confirm], { envFile: db.envFile });
    const st2 = await cli(['status'], { envFile: db.envFile });
    check('after baseline: run applies nothing, status shows baseline, exit 0', again.code === 0 && /0 applied/.test(again.out) && st2.code === 0 && /baseline\s+20261028000000/.test(st2.out));
    await db.client.end();
  }

  // G. a schema that only LOOKS right cannot be baselined; a failed baseline leaves no history table
  {
    const db = await scratchDb('drift');
    await db.client.query(PROD_APPLY);
    await db.client.query(`DROP INDEX "UQ_assessment_attempts_open";
      ALTER TABLE "personal_courses" ALTER COLUMN "title" TYPE varchar(100);
      ALTER TABLE "user_avatars" ADD COLUMN "extra" text;
      ALTER TABLE "learner_assessments" DROP CONSTRAINT "learner_assessments_kind_check";
      ALTER TABLE "learner_assessments" ADD CONSTRAINT "learner_assessments_kind_check" CHECK ("kind" IN ('Quiz', 'Exam'));
      CREATE FUNCTION noop() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
      CREATE TRIGGER audit BEFORE INSERT ON "personal_courses" FOR EACH ROW EXECUTE FUNCTION noop();`);
    const dry = await cli(['baseline', '20261028000000', '--dry-run'], { envFile: db.envFile });
    const want = [/missing index: assessment_attempts\.UQ_assessment_attempts_open/, /personal_courses\.title: type is "character varying\(100\)"/, /unexpected column: user_avatars\.extra/, /learner_assessments_kind_check: expression/, /unexpected trigger: personal_courses\.audit/];
    check('baseline --dry-run reports each difference (case-sensitive CHECK, type, index, column, trigger), exit 3', dry.code === 3 && want.every((w) => w.test(dry.out)), want.filter((w) => !w.test(dry.out)).join(' '));
    const b = await cli(['baseline', '20261028000000', db.confirm], { envFile: db.envFile });
    check('baseline refuses, records nothing, and leaves no history table', b.code === 1 && /does NOT match/.test(b.out) && !(await hasHistory(db.client)));
    await db.client.end();
  }

  // H. a tampered or unpinned snapshot is refused even if it would "match"
  {
    const db = await scratchDb('tamper');
    await db.client.query(PROD_APPLY);
    const dir = copyRepoMigrations('tamper');
    const snapFile = path.join(dir, '20261028000000_learner_content_and_self_service.schema.json');
    const snap = JSON.parse(fs.readFileSync(snapFile, 'utf8'));
    snap.verified.columns = snap.verified.columns.filter((c) => c.column !== 'id'); // weaker expectation
    fs.writeFileSync(snapFile, JSON.stringify(snap, null, 2));
    const r = await cli(['baseline', '20261028000000', '--dry-run', `--dir=${dir}`], { envFile: db.envFile });
    check('a modified snapshot (not matching the pinned SHA-256) is refused', r.code === 1 && /does not match the SHA-256 pinned/.test(r.out) && !(await hasHistory(db.client)));
    await db.client.end();
  }

  // I. a migration that cannot run in a transaction
  {
    const db = await scratchDb('notx');
    const dir = migDir('notx', { '20260101000000_t.sql': 'CREATE TABLE t (id int);', '20260102000000_idx.sql': '-- migrate:no-transaction\nCREATE INDEX CONCURRENTLY "IDX_t_id" ON t (id);' });
    const r = await cli(['run', `--dir=${dir}`, db.confirm], { envFile: db.envFile });
    const idx = await db.client.query(`SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_t_id'`);
    check('"-- migrate:no-transaction" runs CREATE INDEX CONCURRENTLY and records it', r.code === 0 && idx.rowCount === 1 && (await history(db.client)).length === 2, (r.out.match(/✖ ([^\n]*)/) ?? [])[1]);
    await db.client.end();
  }

  // J. target isolation, configuration errors and TLS
  {
    const db = await scratchDb('isolation');
    const elsewhere = `postgresql://someone:topsecret-${RUN}@db.nonexistent-${RUN}.supabase.co:5432/postgres`;
    const iso = await cli(['status'], { envFile: db.envFile, env: { MIGRATION_DATABASE_URL: elsewhere, DATABASE_URL: elsewhere } });
    check('--target-env-file decides the target: inherited MIGRATION_DATABASE_URL/DATABASE_URL are ignored', iso.code === 3 && iso.out.includes(`${db.name} on`) && !iso.out.includes('nonexistent'));
    const missing = await cli(['status', `--target-env-file=${path.join(tmp, 'no-such.env')}`]);
    check('a missing --target-env-file is an error (exit 2)', missing.code === 2 && /--target-env-file not found/.test(missing.out));
    const blank = await cli(['status'], { env: { MIGRATION_DATABASE_URL: '' } });
    check('a blank MIGRATION_DATABASE_URL in the environment fails instead of falling back to .env/DATABASE_URL', blank.code === 2 && /set but empty/.test(blank.out));
    const strict = await cli(['status', '--strict-target'], { envFile: db.envFile });
    check('--strict-target without MIGRATION_DATABASE_URL: exit 2, nothing contacted', strict.code === 2 && /Strict target mode/.test(strict.out) && !/History table/.test(strict.out));
    const strictEnv = path.join(tmp, 'strict.env');
    const o = base.options;
    fs.writeFileSync(strictEnv, `MIGRATION_DATABASE_URL=postgresql://${encodeURIComponent(o.user)}:${encodeURIComponent(o.password)}@localhost:${o.port}/${db.name}\nMIGRATION_STRICT_TARGET=true\n`);
    const strictOk = await cli(['status'], { envFile: strictEnv });
    check('strict mode with MIGRATION_DATABASE_URL works (from MIGRATION_DATABASE_URL, strict)', strictOk.code === 3 && /from MIGRATION_DATABASE_URL, strict, local/.test(strictOk.out));
    const remoteNoConfirm = await cli(['run'], { env: { MIGRATION_DATABASE_URL: elsewhere } });
    check('remote write without --confirm-target: refused before reading configuration or connecting', remoteNoConfirm.code === 2 && /needs --confirm-target/.test(remoteNoConfirm.out) && !/Could not connect/.test(remoteNoConfirm.out));
    const remoteWrong = await cli(['run', '--confirm-target=postgres@wrong:5432'], { env: { MIGRATION_DATABASE_URL: elsewhere } });
    check('remote write with a wrong --confirm-target: refused before connecting, password never printed', remoteWrong.code === 2 && /does not match the resolved target/.test(remoteWrong.out) && !/Could not connect/.test(remoteWrong.out) && !remoteWrong.out.includes(`topsecret-${RUN}`));
    const insecure = await cli(['status'], { env: { MIGRATION_DATABASE_URL: `${elsewhere}?sslmode=require` } });
    check('sslmode=require on a remote URL is refused (no unverified TLS)', insecure.code === 2 && /does not verify the server/.test(insecure.out));
    // 127.0.0.2 is this machine, but not a "local" name: TLS with certificate verification is required, so the local
    // server (no TLS, or a certificate that is not trusted) is refused instead of falling back to plain text
    const tlsEnv = path.join(tmp, 'tls.env');
    fs.writeFileSync(tlsEnv, `MIGRATION_DATABASE_URL=postgresql://${encodeURIComponent(o.user)}:${encodeURIComponent(o.password)}@127.0.0.2:${o.port}/${db.name}\n`);
    const before = await connections(db.name);
    const tls = await cli(['status'], { envFile: tlsEnv });
    check('non-local target: TLS is enforced and never downgraded (connection refused, exit 2)', tls.code === 2 && /Could not connect/.test(tls.out) && /TLS verified/.test(tls.out) && !tls.out.includes(String(o.password)), (tls.out.match(/Could not connect: ([^\n(]*)/) ?? [])[1]?.trim());
    check('…and no session was left open on the server', (await connections(db.name)) === before);
    const wrongPw = path.join(tmp, 'wrongpw.env');
    fs.writeFileSync(wrongPw, `DATABASE_HOST=${o.host}\nDATABASE_PORT=${o.port}\nDATABASE_USER=${o.user}\nDATABASE_PASSWORD=definitely-wrong-${RUN}\nDATABASE_NAME=postgres\n`);
    const wrong = await cli(['status'], { envFile: wrongPw });
    check('wrong password: exit 2, and the password is not printed', wrong.code === 2 && /Could not connect/.test(wrong.out) && !wrong.out.includes(`definitely-wrong-${RUN}`));
    await db.client.end();
  }

  // K. create
  {
    const dir = path.join(tmp, 'create');
    const r = await cli(['create', 'Add course tags', `--dir=${dir}`]);
    const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
    check('create writes a timestamped template and touches no database', r.code === 0 && files.length === 1 && /^\d{14}_add_course_tags\.sql$/.test(files[0]) && /does NOT apply it to production/.test(r.out), files[0]);
  }
} finally {
  for (const name of created) await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`).catch(() => {}); // only databases this script created
  await admin.end();
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log(`\n${passed}/${passed + failed} checks passed`);
process.exitCode = failed ? 1 : 0;
