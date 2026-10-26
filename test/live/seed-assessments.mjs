// Seeds one quiz, one test and one exam (with answer keys) into the DISPOSABLE e2e database "gleamlearn_e2e".
// Refuses non-local hosts. Never prints credentials. Prints the created ids as JSON.
// Usage (from the backend repo): node test/live/seed-assessments.mjs
import { createRequire } from 'module';
import fs from 'fs';

const pg = createRequire(process.cwd() + '/package.json')('pg');
const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8').split(/\r?\n/).filter((l) => l && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
);
const host = env.DATABASE_HOST || 'localhost';
if (!['localhost', '127.0.0.1', '::1'].includes(host)) { console.log('REFUSING: database host is not local'); process.exit(2); }

const run = Date.now().toString(36);
const questions = [
  { question: 'What is 2 + 2?', options: ['3', '4', '5'], correctAnswer: '4', explanation: 'Two pairs make four.' },
  { question: 'What is the capital of Nigeria?', options: ['Lagos', 'Abuja', 'Kano'], correctAnswer: 'B', explanation: 'Abuja since 1991.' },
];
const client = new pg.Client({ host, port: +(env.DATABASE_PORT || 5432), user: env.DATABASE_USER || 'postgres', password: env.DATABASE_PASSWORD || 'postgres', database: 'gleamlearn_e2e' });
await client.connect();
try {
  const ids = {};
  for (const [table, extra] of [['quizzes', ''], ['tests', ', "durationMinutes"'], ['exams', ', "durationMinutes"']]) {
    const cols = `title, description, questions${extra}`;
    const values = extra ? '$1, $2, $3::jsonb, 20' : '$1, $2, $3::jsonb';
    const r = await client.query(`INSERT INTO ${table} (${cols}) VALUES (${values}) RETURNING id`, [`E2E ${table} ${run}`, `Seeded for browser tests (${run})`, JSON.stringify(questions)]);
    ids[table] = r.rows[0].id;
  }
  console.log(JSON.stringify({ run, ...ids }));
} finally {
  await client.end();
}
