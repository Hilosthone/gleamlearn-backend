// scripts/db/schema-snapshot.mjs — reads a fixed set of tables' schema from the PostgreSQL catalogue and compares it
// with an expected snapshot (database/migrations/<migration>.schema.json).
//
// Only the parameterised SELECTs below are ever executed for verification (no SQL is read from files), and the
// runner executes them inside a READ ONLY transaction. Values are compared exactly; the only normalisation is
// collapsing runs of whitespace in expressions (no case folding, no removal of parentheses or casts).
//
// VERIFIED per table: it exists in schema public; it is an ordinary (relkind r), permanent (relpersistence p), non-
// partition table; no user (non-internal) triggers.
// VERIFIED per column: name, exact type with modifiers (format_type, e.g. "character varying(200)"), NOT NULL, default
// expression, identity (attidentity), generated (attgenerated), collation; and no unexpected columns.
// VERIFIED per index: name, access method, unique, primary, key/included column counts, columns in order, per-column
// options (DESC/NULLS), expressions, partial predicate, valid; and no unexpected indexes.
// VERIFIED per constraint (primary key, unique, foreign key, check, exclusion): name, kind, columns in order, referenced
// schema/table/columns, ON DELETE/ON UPDATE/MATCH, deferrable/deferred, validated, CHECK expression, backing index;
// and no unexpected constraints. (NOT NULL is verified on the columns; PostgreSQL 18 also lists it in pg_constraint.)
// REPORTED ONLY, NOT VERIFIED: row level security flags and policies, grants and ownership, index operator classes and
// per-column index collations, table storage parameters, comments, statistics targets.

export const SNAPSHOT_FORMAT = 1;
export const NOT_VERIFIED = [
  'row level security (relrowsecurity / relforcerowsecurity) and policies — reported only',
  'grants, default privileges and ownership',
  'index operator classes and per-column index collations',
  'table/index storage parameters, tablespaces, comments, statistics targets',
  'row contents (a baseline never reads data)',
];

const Q_TABLES = `
SELECT c.relname AS table, c.relkind::text AS kind, c.relpersistence::text AS persistence, c.relispartition AS partition,
       c.relrowsecurity AS rls, c.relforcerowsecurity AS force_rls
FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = ANY($1::text[])`;

const Q_COLUMNS = `
SELECT c.relname AS table, a.attname AS column, pg_catalog.format_type(a.atttypid, a.atttypmod) AS type,
       a.attnotnull AS not_null, pg_catalog.pg_get_expr(d.adbin, d.adrelid) AS "default",
       a.attidentity::text AS identity, a.attgenerated::text AS generated,
       CASE WHEN a.attcollation = 0 THEN NULL ELSE co.collname END AS collation
FROM pg_catalog.pg_attribute a
JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
LEFT JOIN pg_catalog.pg_collation co ON co.oid = a.attcollation
WHERE n.nspname = 'public' AND c.relname = ANY($1::text[]) AND a.attnum > 0 AND NOT a.attisdropped`;

const Q_INDEXES = `
SELECT c.relname AS table, i.relname AS index, am.amname AS method, x.indisunique AS "unique", x.indisprimary AS "primary",
       x.indnkeyatts AS key_columns, x.indnatts AS all_columns,
       ARRAY(SELECT CASE WHEN k.attnum = 0 THEN NULL ELSE a.attname::text END
             FROM unnest(x.indkey::int2[]) WITH ORDINALITY AS k(attnum, ord)
             LEFT JOIN pg_catalog.pg_attribute a ON a.attrelid = x.indrelid AND a.attnum = k.attnum ORDER BY k.ord) AS columns,
       x.indoption::int2[]::int[] AS options,
       pg_catalog.pg_get_expr(x.indexprs, x.indrelid) AS expressions,
       pg_catalog.pg_get_expr(x.indpred, x.indrelid) AS predicate,
       x.indisvalid AS valid
FROM pg_catalog.pg_index x
JOIN pg_catalog.pg_class c ON c.oid = x.indrelid
JOIN pg_catalog.pg_class i ON i.oid = x.indexrelid
JOIN pg_catalog.pg_am am ON am.oid = i.relam
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = ANY($1::text[])`;

const Q_CONSTRAINTS = `
SELECT c.relname AS table, con.conname AS name, con.contype::text AS type,
       ARRAY(SELECT a.attname::text FROM unnest(con.conkey) WITH ORDINALITY AS k(attnum, ord)
             JOIN pg_catalog.pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k.attnum ORDER BY k.ord) AS columns,
       rn.nspname AS ref_schema, rc.relname AS ref_table,
       ARRAY(SELECT a.attname::text FROM unnest(con.confkey) WITH ORDINALITY AS k(attnum, ord)
             JOIN pg_catalog.pg_attribute a ON a.attrelid = con.confrelid AND a.attnum = k.attnum ORDER BY k.ord) AS ref_columns,
       NULLIF(con.confdeltype::text, ' ') AS on_delete, NULLIF(con.confupdtype::text, ' ') AS on_update,
       NULLIF(con.confmatchtype::text, ' ') AS "match",
       con.condeferrable AS deferrable, con.condeferred AS deferred, con.convalidated AS validated,
       CASE WHEN con.contype = 'c' THEN pg_catalog.pg_get_expr(con.conbin, con.conrelid) END AS expression,
       ix.relname AS index
FROM pg_catalog.pg_constraint con
JOIN pg_catalog.pg_class c ON c.oid = con.conrelid
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_catalog.pg_class rc ON rc.oid = con.confrelid
LEFT JOIN pg_catalog.pg_namespace rn ON rn.oid = rc.relnamespace
LEFT JOIN pg_catalog.pg_class ix ON ix.oid = con.conindid
WHERE n.nspname = 'public' AND c.relname = ANY($1::text[]) AND con.contype IN ('p', 'u', 'f', 'c', 'x')`;

const Q_TRIGGERS = `
SELECT c.relname AS table, t.tgname AS name
FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = ANY($1::text[]) AND NOT t.tgisinternal`;

const Q_POLICIES = `
SELECT tablename AS table, policyname AS name FROM pg_catalog.pg_policies WHERE schemaname = 'public' AND tablename = ANY($1::text[])`;

/** Collapses whitespace runs only. Case, parentheses, casts and literals are kept exactly. */
export const normaliseExpr = (s) => (s === null || s === undefined ? null : String(s).replace(/\s+/g, ' ').trim());

const byKey = (keyFn) => (a, b) => (keyFn(a) < keyFn(b) ? -1 : keyFn(a) > keyFn(b) ? 1 : 0);

/**
 * Reads the schema of `tables` (schema public). Runs SELECTs only; call it inside a READ ONLY transaction.
 * Returns { serverVersionNum, verified: {...}, reported: { rls, policies } }.
 */
export async function readSchema(client, tables) {
  const q = (sql) => client.query({ text: sql, values: [tables] }).then((r) => r.rows);
  const [t, cols, idx, cons, trg, pol, ver] = [await q(Q_TABLES), await q(Q_COLUMNS), await q(Q_INDEXES), await q(Q_CONSTRAINTS), await q(Q_TRIGGERS), await q(Q_POLICIES), await client.query('SHOW server_version_num')];
  return {
    serverVersionNum: Number(ver.rows[0].server_version_num),
    verified: {
      tables: t.map((r) => ({ table: r.table, kind: r.kind, persistence: r.persistence, partition: r.partition })).sort(byKey((r) => r.table)),
      columns: cols.map((r) => ({ ...r, default: normaliseExpr(r.default) })).sort(byKey((r) => `${r.table}.${r.column}`)),
      indexes: idx.map((r) => ({ ...r, expressions: normaliseExpr(r.expressions), predicate: normaliseExpr(r.predicate) })).sort(byKey((r) => `${r.table}.${r.index}`)),
      constraints: cons.map((r) => ({ ...r, expression: normaliseExpr(r.expression) })).sort(byKey((r) => `${r.table}.${r.name}`)),
      triggers: trg.sort(byKey((r) => `${r.table}.${r.name}`)),
    },
    reported: {
      rls: t.map((r) => ({ table: r.table, rls: r.rls, force_rls: r.force_rls })).sort(byKey((r) => r.table)),
      policies: pol.sort(byKey((r) => `${r.table}.${r.name}`)),
    },
  };
}

const SECTIONS = {
  tables: (r) => r.table,
  columns: (r) => `${r.table}.${r.column}`,
  indexes: (r) => `${r.table}.${r.index}`,
  constraints: (r) => `${r.table}.${r.name}`,
  triggers: (r) => `${r.table}.${r.name}`,
};
const SINGULAR = { tables: 'table', columns: 'column', indexes: 'index', constraints: 'constraint', triggers: 'trigger' };
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * Differences between an expected snapshot and the live schema, as readable strings (empty = identical).
 * An expected item may list `alternatives: { <field>: [<value>, …] }` for values a different PostgreSQL major version
 * prints differently; they are part of the pinned snapshot, so adding one is a reviewed, checksummed change.
 */
export function compareSchema(expected, actual) {
  const problems = [];
  for (const [section, keyOf] of Object.entries(SECTIONS)) {
    const exp = new Map((expected[section] ?? []).map((r) => [keyOf(r), r]));
    const act = new Map((actual[section] ?? []).map((r) => [keyOf(r), r]));
    for (const [key, e] of exp) {
      const a = act.get(key);
      if (!a) {
        problems.push(`missing ${SINGULAR[section]}: ${key}`);
        continue;
      }
      for (const field of Object.keys(e)) {
        if (field === 'alternatives') continue;
        const accepted = [e[field], ...((e.alternatives ?? {})[field] ?? [])];
        if (!accepted.some((v) => same(v, a[field]))) problems.push(`${SINGULAR[section]} ${key}: ${field} is ${JSON.stringify(a[field])}, expected ${JSON.stringify(e[field])}`);
      }
      for (const field of Object.keys(a)) if (!(field in e)) problems.push(`${SINGULAR[section]} ${key}: unexpected property ${field}`);
    }
    for (const key of act.keys()) if (!exp.has(key)) problems.push(`unexpected ${SINGULAR[section]}: ${key}`);
  }
  return problems;
}

/** Validates the structure of a snapshot file (it is data, never executed). */
export function validateSnapshot(snap, version) {
  if (!snap || typeof snap !== 'object') throw new Error('snapshot is not a JSON object');
  if (snap.format !== SNAPSHOT_FORMAT) throw new Error(`snapshot format must be ${SNAPSHOT_FORMAT}`);
  if (snap.migration !== version) throw new Error(`snapshot is for migration ${snap.migration}, not ${version}`);
  if (!Array.isArray(snap.tableNames) || !snap.tableNames.length || !snap.tableNames.every((t) => /^[a-z_][a-z0-9_]*$/.test(t))) throw new Error('snapshot tableNames must be lower_snake table names');
  for (const s of Object.keys(SECTIONS)) if (!Array.isArray(snap.verified?.[s])) throw new Error(`snapshot verified.${s} must be an array`);
  const named = new Set(snap.verified.tables.map((t) => t.table));
  if (snap.tableNames.some((t) => !named.has(t)) || named.size !== snap.tableNames.length) throw new Error('snapshot tableNames and verified.tables differ');
}
