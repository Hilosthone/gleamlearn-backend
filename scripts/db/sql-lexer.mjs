// scripts/db/sql-lexer.mjs — splits a PostgreSQL script into top-level statements and finds transaction control.
//
// Understands what can hide a semicolon or a keyword: -- comments, nested /* */ comments, 'strings' (with ''),
// E'strings' (with backslash escapes), "identifiers" (with ""), and $tag$ dollar-quoted bodies $tag$.
// The runner sends each statement it finds separately through the EXTENDED query protocol, which PostgreSQL rejects
// for more than one statement, so even a statement this lexer mis-split could not smuggle in a second one.

export class SqlLexError extends Error {}

/**
 * Top-level statements with their 1-based start line, comments and surrounding whitespace removed from the edges.
 * Throws SqlLexError on an unterminated string, identifier, comment or dollar quote.
 */
export function splitStatements(sql) {
  const out = [];
  let i = 0;
  let start = 0;
  const n = sql.length;
  const push = (end) => {
    const raw = sql.slice(start, end);
    const text = trimSql(raw);
    if (text) {
      const offset = start + leadingNoise(raw);
      out.push({ text, offset, line: lineAt(sql, offset) });
    }
  };
  while (i < n) {
    const c = sql[i];
    const next = sql[i + 1];
    if (c === '-' && next === '-') {
      const nl = sql.indexOf('\n', i);
      i = nl === -1 ? n : nl + 1;
    } else if (c === '/' && next === '*') {
      i = skipBlockComment(sql, i);
    } else if (c === "'") {
      const escapes = isEscapeStringPrefix(sql, i);
      i = skipQuoted(sql, i, "'", escapes);
    } else if (c === '"') {
      i = skipQuoted(sql, i, '"', false);
    } else if (c === '$') {
      const tag = dollarTagAt(sql, i);
      if (tag) {
        const end = sql.indexOf(tag, i + tag.length);
        if (end === -1) throw new SqlLexError(`unterminated dollar-quoted string ${tag} starting at line ${lineAt(sql, i)}`);
        i = end + tag.length;
      } else i++;
    } else if (c === ';') {
      push(i);
      i++;
      start = i;
    } else i++;
  }
  push(n);
  return out;
}

function skipBlockComment(sql, i) {
  let depth = 0;
  const from = i;
  while (i < sql.length) {
    if (sql[i] === '/' && sql[i + 1] === '*') {
      depth++;
      i += 2;
    } else if (sql[i] === '*' && sql[i + 1] === '/') {
      depth--;
      i += 2;
      if (depth === 0) return i;
    } else i++;
  }
  throw new SqlLexError(`unterminated /* comment starting at line ${lineAt(sql, from)}`);
}

function skipQuoted(sql, i, q, backslashEscapes) {
  const from = i;
  i++;
  while (i < sql.length) {
    const c = sql[i];
    if (backslashEscapes && c === '\\') i += 2;
    else if (c === q) {
      if (sql[i + 1] === q) i += 2; // doubled quote
      else return i + 1;
    } else i++;
  }
  throw new SqlLexError(`unterminated ${q === "'" ? 'string' : 'quoted identifier'} starting at line ${lineAt(sql, from)}`);
}

/** E'…' / e'…' (not part of a longer identifier such as "table'"). */
function isEscapeStringPrefix(sql, i) {
  if (i === 0 || !/[eE]/.test(sql[i - 1])) return false;
  return i < 2 || !/[A-Za-z0-9_$]/.test(sql[i - 2]);
}

/** "$tag$" or "$$" at i, unless the "$" continues an identifier or is a parameter like $1. */
function dollarTagAt(sql, i) {
  if (i > 0 && /[A-Za-z0-9_]/.test(sql[i - 1])) return null;
  const m = /^\$([A-Za-z_\u0080-￿][A-Za-z0-9_\u0080-￿]*)?\$/.exec(sql.slice(i, i + 64));
  return m ? m[0] : null;
}

const lineAt = (sql, offset) => sql.slice(0, offset).split('\n').length;

/** Offset of the first character that is not whitespace or a comment. */
function leadingNoise(raw) {
  let i = 0;
  for (;;) {
    while (i < raw.length && /\s/.test(raw[i])) i++;
    if (raw.startsWith('--', i)) {
      const nl = raw.indexOf('\n', i);
      i = nl === -1 ? raw.length : nl + 1;
    } else if (raw.startsWith('/*', i)) {
      i = skipBlockComment(raw, i);
    } else return i;
  }
}

function trimSql(raw) {
  const from = leadingNoise(raw);
  return raw.slice(from).trimEnd();
}

/** The first words of a statement, upper-cased, ignoring comments between them. */
export function leadingWords(text, count = 3) {
  const words = [];
  let i = 0;
  while (words.length < count && i < text.length) {
    i += leadingNoise(text.slice(i));
    const m = /^[A-Za-z_]+/.exec(text.slice(i));
    if (!m) break;
    words.push(m[0].toUpperCase());
    i += m[0].length;
  }
  return words;
}

/**
 * Why a statement would end, start or alter the runner's transaction, or null when it doesn't.
 * Covers BEGIN, START TRANSACTION, COMMIT/END (incl. AND CHAIN, WORK, TRANSACTION), ABORT, ROLLBACK, SAVEPOINT,
 * RELEASE, PREPARE TRANSACTION, COMMIT/ROLLBACK PREPARED and SET TRANSACTION / SESSION CHARACTERISTICS.
 */
export function transactionControl(text) {
  const [a, b, c] = leadingWords(text, 3);
  if (!a) return null;
  if (['BEGIN', 'COMMIT', 'END', 'ABORT', 'ROLLBACK', 'SAVEPOINT', 'RELEASE'].includes(a)) return a;
  if (a === 'START' && b === 'TRANSACTION') return 'START TRANSACTION';
  if (a === 'PREPARE' && b === 'TRANSACTION') return 'PREPARE TRANSACTION';
  if (a === 'SET' && b === 'TRANSACTION') return 'SET TRANSACTION';
  if (a === 'SET' && b === 'SESSION' && c === 'CHARACTERISTICS') return 'SET SESSION CHARACTERISTICS';
  return null;
}
