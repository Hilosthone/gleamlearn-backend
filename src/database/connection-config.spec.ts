import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { typeOrmConnectionConfig } from './connection-config.js';
// the migration runner is plain Node (no build); these tests keep it consistent with the API's configuration
// @ts-ignore-next-line
import { MigrationError, TARGET_VARS, confirmationFor, describeTarget, loadEnvironment, resolveTarget } from '../../scripts/db/migrator.mjs';

const getter = (env: Record<string, string | undefined>) => (name: string) => env[name];

describe('database connection: the API and the migration runner target the same database', () => {
  const cases: Record<string, string | undefined>[] = [
    {},
    { DATABASE_HOST: 'db.internal', DATABASE_PORT: '6000', DATABASE_USER: 'app', DATABASE_PASSWORD: 'pw', DATABASE_NAME: 'gleam' },
    { DATABASE_URL: 'postgresql://postgres.ref:secret@aws-0-eu-west-1.pooler.supabase.com:6543/postgres' },
    { DATABASE_URL: 'postgresql://postgres:secret@db.abcd.supabase.co:5432/postgres' },
    // a non-Supabase DATABASE_URL is ignored by the API (host variables win), so the runner must ignore it too
    { DATABASE_URL: 'postgresql://u:p@elsewhere.example.com:5432/other', DATABASE_HOST: 'localhost', DATABASE_NAME: 'local_db' },
  ];
  it.each(cases)('same host, port, database and user for %o', (env) => {
    const api = typeOrmConnectionConfig(getter(env));
    const runner = resolveTarget(env);
    if (api.url) {
      const u = new URL(api.url);
      expect([runner.host, runner.port, runner.database, runner.user]).toEqual([u.hostname, Number(u.port || 5432), u.pathname.slice(1), decodeURIComponent(u.username)]);
    } else {
      expect([runner.host, runner.port, runner.database, runner.user]).toEqual([api.host, api.port, api.database, api.username]);
    }
  });

  it('the API keeps its existing TLS behaviour; the runner verifies certificates for every non-local host', () => {
    const env = { DATABASE_URL: 'postgresql://postgres:secret@db.abcd.supabase.co:5432/postgres' };
    expect(typeOrmConnectionConfig(getter(env)).ssl).toEqual({ rejectUnauthorized: false }); // unchanged
    expect(resolveTarget(env).options.ssl).toEqual({ rejectUnauthorized: true });
    expect(resolveTarget({ DATABASE_HOST: 'db.internal' }).options.ssl).toEqual({ rejectUnauthorized: true });
    expect(resolveTarget({}).options.ssl).toBeUndefined(); // local
  });

  it('schema auto-sync stays off unless DB_SYNCHRONIZE=true, including in production', () => {
    expect(typeOrmConnectionConfig(getter({})).synchronize).toBe(false);
    expect(typeOrmConnectionConfig(getter({ NODE_ENV: 'production', DATABASE_URL: 'postgresql://u:p@db.x.supabase.co/postgres' })).synchronize).toBe(false);
    expect(typeOrmConnectionConfig(getter({ DB_SYNCHRONIZE: 'false' })).synchronize).toBe(false);
    expect(typeOrmConnectionConfig(getter({ DB_SYNCHRONIZE: 'yes' })).synchronize).toBe(false);
    expect(typeOrmConnectionConfig(getter({ DB_SYNCHRONIZE: 'TRUE' })).synchronize).toBe(true);
  });
});

describe('migration target resolution (no connection is made)', () => {
  const PROD = 'postgresql://postgres:secret@db.prodref.supabase.co:5432/postgres';

  it('MIGRATION_DATABASE_URL overrides the target for the runner only', () => {
    const t = resolveTarget({ DATABASE_HOST: 'localhost', MIGRATION_DATABASE_URL: 'postgresql://owner:pw@db.abcd.supabase.co:5432/postgres' });
    expect([t.host, t.source, t.local]).toEqual(['db.abcd.supabase.co', 'MIGRATION_DATABASE_URL', false]);
  });

  it('a blank MIGRATION_DATABASE_URL is an error, never a fallback to DATABASE_URL', () => {
    expect(() => resolveTarget({ DATABASE_URL: PROD, MIGRATION_DATABASE_URL: '' })).toThrow(/set but empty/);
    expect(() => resolveTarget({ DATABASE_URL: PROD, MIGRATION_DATABASE_URL: '   ' })).toThrow(/set but empty/);
    expect(() => resolveTarget({ DATABASE_URL: PROD, MIGRATION_DATABASE_URL: 'not a url' })).toThrow(/not a valid URL/);
  });

  it('strict mode refuses to use the API database settings at all', () => {
    expect(() => resolveTarget({ DATABASE_URL: PROD }, { strict: true })).toThrow(/Strict target mode/);
    expect(() => resolveTarget({ DATABASE_URL: PROD, MIGRATION_STRICT_TARGET: 'true' })).toThrow(/Strict target mode/);
    expect(() => resolveTarget({ DATABASE_HOST: 'localhost' }, { strict: true })).toThrow(/Strict target mode/);
    expect(resolveTarget({ MIGRATION_DATABASE_URL: 'postgresql://u:p@localhost:5432/scratch' }, { strict: true }).database).toBe('scratch');
  });

  it('rejects invalid targets before connecting', () => {
    expect(() => resolveTarget({ MIGRATION_DATABASE_URL: 'mysql://x@y/z' })).toThrow(/postgres/);
    expect(() => resolveTarget({ MIGRATION_DATABASE_URL: 'postgresql://u:p@host.example.com:5432/' })).toThrow(/no database name/);
    expect(() => resolveTarget({ MIGRATION_DATABASE_URL: 'postgresql://u:%E0%A4%A@localhost/db' })).toThrow(/percent-encoding/);
    expect(() => resolveTarget({ DATABASE_PORT: 'abc' })).toThrow(/port/);
    expect(() => resolveTarget({ DATABASE_PORT: '70000' })).toThrow(/port/);
    expect(() => resolveTarget({ DATABASE_HOST: '  ' })).toThrow(/DATABASE_HOST is empty/);
    expect(() => resolveTarget({ DATABASE_NAME: '' })).toThrow(/DATABASE_NAME is empty/);
  });

  it('refuses TLS settings in the URL that would weaken certificate verification for a remote host', () => {
    for (const mode of ['disable', 'allow', 'prefer', 'require', 'no-verify', 'verify-ca']) {
      expect(() => resolveTarget({ MIGRATION_DATABASE_URL: `${PROD}?sslmode=${mode}` })).toThrow(/does not verify the server/);
    }
    expect(() => resolveTarget({ MIGRATION_DATABASE_URL: `${PROD}?ssl=false` })).toThrow(/TLS parameter "ssl"/);
    expect(() => resolveTarget({ MIGRATION_DATABASE_URL: `${PROD}?sslrootcert=/x.crt` })).toThrow(/MIGRATION_DATABASE_SSL_ROOT_CERT/);
    const ok = resolveTarget({ MIGRATION_DATABASE_URL: `${PROD}?sslmode=verify-full&application_name=x` });
    expect(ok.options.ssl).toEqual({ rejectUnauthorized: true });
    expect(ok.options.connectionString).not.toMatch(/sslmode/); // stripped so the driver cannot override the TLS options
  });

  it('uses a CA file for verification when MIGRATION_DATABASE_SSL_ROOT_CERT is set, and refuses a missing/blank one', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ca-'));
    const ca = path.join(dir, 'ca.crt');
    fs.writeFileSync(ca, '-----BEGIN CERTIFICATE-----\nnot-a-real-cert\n-----END CERTIFICATE-----\n');
    try {
      expect(resolveTarget({ MIGRATION_DATABASE_URL: PROD, MIGRATION_DATABASE_SSL_ROOT_CERT: ca }).options.ssl).toEqual({ rejectUnauthorized: true, ca: fs.readFileSync(ca, 'utf8') });
      expect(() => resolveTarget({ MIGRATION_DATABASE_URL: PROD, MIGRATION_DATABASE_SSL_ROOT_CERT: path.join(dir, 'missing.crt') })).toThrow(/not found/);
      expect(() => resolveTarget({ MIGRATION_DATABASE_URL: PROD, MIGRATION_DATABASE_SSL_ROOT_CERT: '' })).toThrow(/set but empty/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('confirmation text is the resolved database@host:port, for local targets too', () => {
    expect(confirmationFor(resolveTarget({}))).toBe('mycoursea_db@localhost:5432');
    expect(confirmationFor(resolveTarget({ MIGRATION_DATABASE_URL: PROD }))).toBe('postgres@db.prodref.supabase.co:5432');
  });

  it('the printable description never contains the password', () => {
    for (const env of [{ MIGRATION_DATABASE_URL: PROD }, { DATABASE_URL: PROD }, { DATABASE_PASSWORD: 'secret' }]) expect(describeTarget(resolveTarget(env))).not.toMatch(/secret/);
  });

  it('an explicit env file decides the target alone: inherited target variables are ignored; a missing file is an error', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'envfile-'));
    const file = path.join(dir, 'local.env');
    fs.writeFileSync(file, 'DATABASE_HOST=localhost\nDATABASE_NAME=scratch_db\n');
    try {
      const inherited = { DATABASE_URL: PROD, MIGRATION_DATABASE_URL: PROD, DATABASE_NAME: 'postgres', OTHER: 'kept' };
      const env = loadEnvironment({ envFile: file, explicit: true, base: inherited });
      for (const k of ['DATABASE_URL', 'MIGRATION_DATABASE_URL']) expect(env[k]).toBeUndefined();
      expect([env.DATABASE_NAME, env.OTHER]).toEqual(['scratch_db', 'kept']);
      expect(resolveTarget(env).database).toBe('scratch_db');
      expect(() => loadEnvironment({ envFile: path.join(dir, 'nope.env'), explicit: true, base: {} })).toThrow(MigrationError);
      // default .env: the environment wins, like dotenv and the API
      expect(loadEnvironment({ defaultFile: file, base: { DATABASE_NAME: 'from_env' } }).DATABASE_NAME).toBe('from_env');
      expect(TARGET_VARS).toEqual(expect.arrayContaining(['DATABASE_URL', 'MIGRATION_DATABASE_URL', 'DATABASE_HOST', 'DATABASE_NAME']));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('migrations never run implicitly', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };
  it('build and start scripts do not invoke the runner', () => {
    for (const name of ['build', 'start', 'start:prod', 'start:dev', 'postinstall', 'prebuild', 'prestart', 'prestart:prod', 'postbuild']) {
      expect(pkg.scripts[name] ?? '').not.toMatch(/migrat|scripts\/db/);
    }
  });
  it('the API code does not import the runner', () => {
    const offenders: string[] = [];
    const walk = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith('.ts') && !e.name.endsWith('.spec.ts')) {
          // an import of the runner, TypeORM's own migration hooks, or a spawn of the CLI (comments don't count)
          const code = fs.readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
          if (/from\s+['"][^'"]*(scripts\/db|migrator)[^'"]*['"]|\.runMigrations\(|migrationsRun\s*:\s*true|migrate\.mjs/.test(code)) offenders.push(p);
        }
      }
    };
    walk('src');
    expect(offenders).toEqual([]);
  });
});
