import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { UsageError, parseCli } from '../../scripts/db/cli-args.mjs';
import { splitStatements, transactionControl } from '../../scripts/db/sql-lexer.mjs';
import { compareSchema, normaliseExpr, validateSnapshot } from '../../scripts/db/schema-snapshot.mjs';
import { assertConnectedTarget, checksum, describeSqlError, discoverMigrations, loadPinnedSnapshot, newMigrationFileName, parseMigrationSql, summarise } from '../../scripts/db/migrator.mjs';

describe('command-line arguments: invalid input can never turn into a write', () => {
  const usage = (argv: string[]) => {
    try {
      parseCli(argv);
      return null;
    } catch (e) {
      expect(e).toBeInstanceOf(UsageError);
      return (e as Error).message;
    }
  };

  it('accepts only the documented forms', () => {
    expect(parseCli(['status'])).toMatchObject({ command: 'status', write: false });
    expect(parseCli(['run', '--dry-run'])).toMatchObject({ write: false });
    expect(parseCli(['run', '--confirm-target=db@localhost:5432'])).toMatchObject({ write: true, options: { 'confirm-target': 'db@localhost:5432' } });
    expect(parseCli(['baseline', '20261028000000', '--dry-run', '--strict-target', '--target-env-file=prod.env'])).toMatchObject({ write: false, positionals: ['20261028000000'] });
    expect(parseCli(['create', 'add', 'tags'])).toMatchObject({ positionals: ['add', 'tags'], write: false });
  });

  it.each([
    [['run', '--dry-run=true'], /takes no value/],
    [['run', '--dry-run=false'], /takes no value/],
    [['run', '--dryrun'], /Unknown option "--dryrun"/],
    [['run', '--dry_run'], /Unknown option "--dry_run"/],
    [['run', '-n'], /Unexpected argument "-n"/],
    [['run', '--'], /Unexpected argument "--"/],
    [['baseline', '20261028000000', '--dry-run', '--confirm-target=db@h:5432'], /cannot be combined/],
    [['run', '--dry-run', '--confirm-target=db@h:5432'], /cannot be combined/],
    [['run', '--dry-run', '--dry-run'], /more than once/],
    [['run'], /needs --confirm-target/],
    [['baseline', '20261028000000'], /needs --confirm-target/],
    [['run', '--confirm-target'], /needs a value/],
    [['run', '--confirm-target='], /needs a value/],
    [['status', '--confirm-target=db@h:5432'], /Unknown option/],
    [['status', '--dry-run'], /Unknown option/],
    [['status', 'extra'], /Unexpected argument "extra"/],
    [['baseline', '--dry-run'], /needs an argument/],
    [['baseline', 'a', 'b', '--dry-run'], /Unexpected argument "b"/],
    [['run', '--dry-run', '--lock-timeout-ms=-1'], /whole number/],
    [['run', '--dry-run', '--statement-timeout-ms=1e3'], /whole number/],
    // Node 24 itself inspects "--env-file" even after the script name, so the runner uses its own name
    [['status', '--env-file=x.env'], /Unknown option "--env-file"/],
    [['status', '--target-env-file'], /needs a value/],
    [['migrate'], /Unknown command/],
    [[], /No command/],
  ])('%j is refused', (argv, message) => {
    expect(usage(argv as string[])).toMatch(message as RegExp);
  });
});

describe('SQL lexer: transaction control is found wherever it hides', () => {
  const controls = (sql: string) => splitStatements(sql).map((s: { text: string }) => transactionControl(s.text)).filter(Boolean);

  it.each([
    ['COMMIT;', 'COMMIT'],
    ['END;', 'END'],
    ['END TRANSACTION;', 'END'],
    ['ABORT;', 'ABORT'],
    ['COMMIT AND CHAIN;', 'COMMIT'],
    ['ROLLBACK AND CHAIN;', 'ROLLBACK'],
    ['commit work;', 'COMMIT'],
    ['CREATE TABLE a (id int);\nCOMMIT', 'COMMIT'], // no trailing semicolon
    ['SELECT 1; COMMIT;', 'COMMIT'], // two statements on one line
    ['SELECT 1;/* c */COMMIT;', 'COMMIT'],
    ['SELECT 1;\n-- comment\n  commit;', 'COMMIT'],
    ['/* a /* nested */ comment */ END;', 'END'],
    ["PREPARE TRANSACTION 'x';", 'PREPARE TRANSACTION'],
    ['BEGIN;', 'BEGIN'],
    ['START TRANSACTION;', 'START TRANSACTION'],
    ['SAVEPOINT s;', 'SAVEPOINT'],
    ['RELEASE SAVEPOINT s;', 'RELEASE'],
    ['SET TRANSACTION READ ONLY;', 'SET TRANSACTION'],
    ['SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY;', 'SET SESSION CHARACTERISTICS'],
  ])('%j → %s', (sql, kind) => {
    expect(controls(sql as string)).toContain(kind);
  });

  it('is not fooled by keywords inside strings, identifiers, comments or function bodies', () => {
    const sql = [
      "INSERT INTO t VALUES ('COMMIT; END; ROLLBACK;');",
      "INSERT INTO t VALUES (E'it\\'s; COMMIT;');",
      "INSERT INTO t VALUES ('a''b; COMMIT;');",
      'CREATE TABLE "COMMIT;" (id int);',
      '-- COMMIT;',
      '/* END; */',
      'CREATE FUNCTION f() RETURNS int LANGUAGE plpgsql AS $$\nBEGIN\n  RETURN 1;\nEND;\n$$;',
      'CREATE FUNCTION g() RETURNS text LANGUAGE sql AS $body$ SELECT \'COMMIT;\' $body$;',
      'DO $x$ BEGIN PERFORM 1; END $x$;',
    ].join('\n');
    expect(controls(sql)).toEqual([]);
    expect(splitStatements(sql)).toHaveLength(7);
  });

  it('reports statement start lines and refuses unterminated strings, identifiers, comments and dollar quotes', () => {
    expect(splitStatements('-- header\n\nCREATE TABLE a (id int);\n\nCREATE TABLE b (id int);').map((s: { line: number }) => s.line)).toEqual([3, 5]);
    for (const bad of ["SELECT 'oops;", 'SELECT "oops;', 'SELECT 1; /* oops', 'SELECT $$ oops;']) expect(() => splitStatements(bad)).toThrow(/unterminated/);
  });

  it('parseMigrationSql names each forbidden statement and its line', () => {
    expect(() => parseMigrationSql('CREATE TABLE a (id int);\nSELECT 1; COMMIT;\nEND;', 'x.sql')).toThrow(/COMMIT at line 2, END at line 3/);
  });
});

describe('migration files', () => {
  let dir: string;
  const write = (name: string, sql = 'SELECT 1;') => fs.writeFileSync(path.join(dir, name), sql);
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'migrations-'));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('are ordered by version, whatever order the file system lists them in; .schema.json files are not migrations', () => {
    write('20261101120000_second.sql');
    write('20261028000000_first.sql');
    write('20261028000000_first.schema.json', '{}');
    write('20261201000000_third.sql', '-- migrate:no-transaction\nCREATE INDEX CONCURRENTLY x ON y (z);');
    const m = discoverMigrations(dir);
    expect(m.map((x: { file: string }) => x.file)).toEqual(['20261028000000_first.sql', '20261101120000_second.sql', '20261201000000_third.sql']);
    expect(m[0].snapshotPath).toMatch(/first\.schema\.json$/);
    expect(m.map((x: { transactional: boolean }) => x.transactional)).toEqual([true, true, false]);
  });

  it('refuse ambiguous names, duplicates, empty files, transaction control, multi-statement no-transaction files and old .verify.sql files', () => {
    write('20261028_short.sql');
    write('20261028000000_Upper-Case.sql');
    write('20261029000000_a.sql');
    write('20261029000000_b.sql');
    write('20261030000000_empty.sql', '-- only a comment\n');
    write('20261031000000_tx.sql', 'CREATE TABLE a (id int); END;');
    write('20261101000000_notx.sql', '-- migrate:no-transaction\nCREATE INDEX CONCURRENTLY a ON t (x);\nCREATE INDEX CONCURRENTLY b ON t (y);');
    write('20261102000000_x.verify.sql', 'SELECT 1');
    let message = '';
    try {
      discoverMigrations(dir);
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toMatch(/20261028_short\.sql: name must be/);
    expect(message).toMatch(/Upper-Case/);
    expect(message).toMatch(/duplicate version 20261029000000/);
    expect(message).toMatch(/empty\.sql: contains no SQL/);
    expect(message).toMatch(/tx\.sql: transaction control is not allowed.*END at line 1/);
    expect(message).toMatch(/notx\.sql: a "-- migrate:no-transaction" migration must contain exactly one statement \(it has 2\)/);
    expect(message).toMatch(/verify\.sql: executable verification files are no longer supported/);
  });

  it('checksums ignore Windows/Unix line-ending differences but catch any edit', () => {
    write('20261028000000_a.sql', 'SELECT 1;\n');
    const unix = discoverMigrations(dir)[0].checksum;
    write('20261028000000_a.sql', 'SELECT 1;\r\n');
    expect(discoverMigrations(dir)[0].checksum).toBe(unix);
    write('20261028000000_a.sql', 'SELECT 2;\n');
    expect(discoverMigrations(dir)[0].checksum).not.toBe(unix);
  });

  it('new file names: UTC timestamp + snake_case name', () => {
    expect(newMigrationFileName('Add course tags!', new Date(Date.UTC(2026, 10, 2, 9, 5, 7)))).toBe('20261102090507_add_course_tags.sql');
    expect(() => newMigrationFileName('  ')).toThrow(/name/);
  });

  it('a baseline snapshot must match the SHA-256 pinned in its migration and be well-formed', () => {
    const snap = { format: 1, migration: '20261028000000', tableNames: ['a'], verified: { tables: [{ table: 'a' }], columns: [], indexes: [], constraints: [], triggers: [] } };
    const json = JSON.stringify(snap);
    write('20261028000000_first.schema.json', json);
    write('20261028000000_first.sql', `-- schema-snapshot-sha256: ${checksum(json)}\nCREATE TABLE a (id int);`);
    expect(loadPinnedSnapshot(discoverMigrations(dir)[0]).snapshot.tableNames).toEqual(['a']);
    // a replaced snapshot (even one that would "match" anything) is refused
    write('20261028000000_first.schema.json', JSON.stringify({ ...snap, verified: { ...snap.verified, tables: [] }, tableNames: [] }));
    expect(() => loadPinnedSnapshot(discoverMigrations(dir)[0])).toThrow(/does not match the SHA-256 pinned/);
    // no pin at all
    write('20261028000000_first.schema.json', json);
    write('20261028000000_first.sql', 'CREATE TABLE a (id int);');
    expect(() => loadPinnedSnapshot(discoverMigrations(dir)[0])).toThrow(/no "-- schema-snapshot-sha256/);
    expect(() => validateSnapshot({ ...snap, migration: 'x' }, '20261028000000')).toThrow(/for migration x/);
    expect(() => validateSnapshot({ ...snap, tableNames: ['A;DROP'] }, '20261028000000')).toThrow(/lower_snake/);
  });

  it('the repository migration is valid, pinned, and its pinned snapshot loads', () => {
    const [m] = discoverMigrations(path.resolve('database/migrations'));
    expect(m.file).toBe('20261028000000_learner_content_and_self_service.sql');
    const { snapshot } = loadPinnedSnapshot(m);
    expect(snapshot.tableNames).toHaveLength(8);
    expect([snapshot.verified.columns.length, snapshot.verified.indexes.length, snapshot.verified.constraints.length]).toEqual([97, 22, 20]);
    expect(m.statements).toHaveLength(30);
  });
});

describe('schema comparison is exact', () => {
  const check = (expr: string) => ({ table: 't', name: 'c', type: 'c', expression: expr });
  it('does not fold case or drop parentheses, so different CHECKs never match', () => {
    const exp = { tables: [], columns: [], indexes: [], triggers: [], constraints: [check("((kind)::text = ANY ((ARRAY['quiz'::character varying])::text[]))")] };
    expect(compareSchema(exp, { ...exp, constraints: [check("((kind)::text = ANY ((ARRAY['Quiz'::character varying])::text[]))")] })).toHaveLength(1);
    expect(compareSchema({ ...exp, constraints: [check('((a = 1) OR ((b = 2) AND (c = 3)))')] }, { ...exp, constraints: [check('(((a = 1) OR (b = 2)) AND (c = 3))')] })).toHaveLength(1);
    expect(normaliseExpr('(a  =\n 1)')).toBe('(a = 1)');
  });
  it('reports missing, unexpected and differing items; reviewed alternatives (pinned with the snapshot) are accepted', () => {
    const col = { table: 't', column: 'x', type: 'integer', not_null: true };
    const base = { tables: [], indexes: [], constraints: [], triggers: [] };
    expect(compareSchema({ ...base, columns: [col] }, { ...base, columns: [] })).toEqual(['missing column: t.x']);
    expect(compareSchema({ ...base, columns: [] }, { ...base, columns: [col] })).toEqual(['unexpected column: t.x']);
    expect(compareSchema({ ...base, columns: [col] }, { ...base, columns: [{ ...col, type: 'bigint' }] })[0]).toMatch(/type is "bigint", expected "integer"/);
    expect(compareSchema({ ...base, columns: [{ ...col, alternatives: { type: ['int4'] } }] }, { ...base, columns: [{ ...col, type: 'int4' }] })).toEqual([]);
    expect(compareSchema({ ...base, triggers: [] }, { ...base, columns: [], triggers: [{ table: 't', name: 'audit' }] })).toEqual(['unexpected trigger: t.audit']);
  });
});

describe('connected-target check', () => {
  it('refuses to continue when the server reports another database than the one resolved (e.g. a proxy routing elsewhere)', async () => {
    const client = (db: string) => ({ query: async () => ({ rows: [{ db }] }) });
    await expect(assertConnectedTarget(client('postgres'), { database: 'postgres' })).resolves.toBeUndefined();
    await expect(assertConnectedTarget(client('other_db'), { database: 'postgres' })).rejects.toThrow(/Connected to database "other_db", expected "postgres"/);
  });
});

describe('status and errors', () => {
  const m = (version: string, sum: string) => ({ version, name: 'n', file: `${version}_n.sql`, checksum: sum });
  it('reports applied, baseline, pending, edited-after-applying and unknown migrations', () => {
    const s = summarise(
      [m('20260101000000', 'a'.repeat(64)), m('20260102000000', 'b'.repeat(64)), m('20260103000000', 'c'.repeat(64)), m('20260104000000', 'd'.repeat(64))],
      [
        { version: '20260101000000', checksum: 'a'.repeat(64), method: 'applied' },
        { version: '20260102000000', checksum: 'b'.repeat(64), method: 'baseline' },
        { version: '20260103000000', checksum: 'x'.repeat(64), method: 'applied' },
        { version: '20259999000000', checksum: 'z'.repeat(64), method: 'applied' },
      ],
    );
    expect(s.rows.map((r: { state: string }) => r.state)).toEqual(['applied', 'baseline', 'changed', 'pending']);
    expect(s.unknown.map((u: { version: string }) => u.version)).toEqual(['20259999000000']);
  });

  it('points at the failing line of the file from the statement and PostgreSQL position', () => {
    const sql = '-- header\nCREATE TABLE a (id int);\nCREATE TABLE b (\n  id nonsense_type\n);';
    const st = splitStatements(sql)[1];
    const msg = describeSqlError({ message: 'type "nonsense_type" does not exist', code: '42704', position: String(st.text.indexOf('nonsense') + 1) }, sql, st);
    expect(msg).toMatch(/SQLSTATE 42704 — at line 4: id nonsense_type/);
  });
});
