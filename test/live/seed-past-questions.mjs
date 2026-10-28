// Seeds a few past questions (TEST FIXTURES, clearly marked) into the DISPOSABLE e2e database "gleamlearn_e2e", so
// the past-questions screens can be tested without the external provider. Refuses non-local hosts. Never prints
// credentials. Prints the subject used as JSON.
// Usage (from the backend repo): node test/live/seed-past-questions.mjs
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
const subject = `e2e-biology-${run}`;
const client = new pg.Client({ host, port: +(env.DATABASE_PORT || 5432), user: env.DATABASE_USER || 'postgres', password: env.DATABASE_PASSWORD || 'postgres', database: 'gleamlearn_e2e' });
await client.connect();
try {
  const rows = [
    ['E2E FIXTURE: Which organelle carries out photosynthesis?', ['Mitochondrion', 'Chloroplast', 'Ribosome', 'Nucleus'], 'b', 'Chloroplasts contain chlorophyll.', 2019, 'Cells'],
    ['E2E FIXTURE: What is the basic unit of heredity?', ['Gene', 'Cell', 'Tissue', 'Organ'], 'a', 'Genes carry hereditary information.', 2020, 'Genetics'],
  ];
  for (const [text, options, answer, explanation, year, topic] of rows) {
    await client.query(
      `INSERT INTO past_questions (id, text, options, "correctAnswer", "examType", subject, year, topic, explanation, country, "hasPassage", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, 'jamb', $4, $5, $6, $7, 'NG', false, now(), now())`,
      [text, JSON.stringify(options), answer, subject, year, topic, explanation],
    );
  }
  console.log(JSON.stringify({ run, subject }));
} finally {
  await client.end();
}
