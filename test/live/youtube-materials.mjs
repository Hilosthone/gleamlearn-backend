// LIVE check of YouTube learning materials against the LOCAL backend (127.0.0.1:5055), the local AI service and the
// local mock NIM (127.0.0.1:8799, counts model calls). Uses the DISPOSABLE database gleamlearn_e2e only.
// YouTube itself is never called (the backend runs with YOUTUBE_NETWORK=off). Prints no secrets.
// Usage: node test/live/youtube-materials.mjs   (start mock_nim.py, start-ai-service.mjs and start-backend.mjs first)
import { createRequire } from 'module';
import fs from 'fs';

const BE = 'http://127.0.0.1:5055/api/v1';
const NIM = 'http://127.0.0.1:8799';
const pg = createRequire(process.cwd() + '/package.json')('pg');
const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8').split(/\r?\n/).filter((l) => l && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
);
const host = env.DATABASE_HOST || 'localhost';
if (!['localhost', '127.0.0.1', '::1'].includes(host)) { console.log('REFUSING: database host is not local'); process.exit(2); }
if ((env.DATABASE_URL || '').includes('supabase.co')) { console.log('REFUSING: DATABASE_URL points at a hosted database'); process.exit(2); }
const db = new pg.Client({ host, port: +(env.DATABASE_PORT || 5432), user: env.DATABASE_USER || 'postgres', password: env.DATABASE_PASSWORD || 'postgres', database: 'gleamlearn_e2e' });
await db.connect();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = 0;
const check = (name, ok, detail = '') => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); };
async function http(method, path, token, body, form) {
  for (let i = 0; i < 8; i++) {
    const r = await fetch(`${BE}${path}`, {
      method,
      headers: { ...(form ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(form ? { body: form() } : body ? { body: JSON.stringify(body) } : {}),
    });
    if (r.status !== 429) return { status: r.status, json: await r.json().catch(() => null) };
    await sleep(3200);
  }
  throw new Error(`${path} stayed throttled`);
}
const nimCalls = async () => (await (await fetch(`${NIM}/__stats`)).json()).requests;
const file = (name, content) => () => { const f = new FormData(); f.append('file', new Blob([content], { type: 'text/plain' }), name); return f; };
const stamp = Date.now().toString(36);

try {
  const s = await http('POST', '/auth/signup', null, { fullName: 'YT Probe', username: `yt_${stamp}`, email: `yt.${stamp}@example.test`, password: 'Yt-Probe-1!', confirmPassword: 'Yt-Probe-1!' });
  const token = s.json.accessToken;

  // ------------------------------------------------------------ failure is named, not "no transcript"
  const created = await http('POST', '/youtube-sessions', token, { url: 'https://youtu.be/dQw4w9WgXcQ', title: 'Live probe video' });
  const sess = created.json;
  check('session created; a server that may not call YouTube says so (code DISABLED_ON_SERVER, not retryable)',
    created.status === 201 && sess.transcriptStatus === 'unavailable' && sess.transcriptErrorCode === 'DISABLED_ON_SERVER' && sess.transcriptRetryable === false,
    `${created.status} ${sess?.transcriptErrorCode}`);

  // ------------------------------------------------------------ caption files
  const bad = await http('POST', `/youtube-sessions/${sess.id}/transcript/captions`, token, null, file('notes.txt', 'just some notes, not captions'));
  check('a file that is not VTT/SRT is rejected with a clear message', bad.status === 400 && /WebVTT|SubRip/.test(JSON.stringify(bad.json)), `${bad.status}`);
  const none = await http('POST', `/youtube-sessions/${sess.id}/transcript/captions`, token, null, () => new FormData());
  check('no file → 400', none.status === 400, `${none.status}`);
  const lines = Array.from({ length: 900 }, (_, i) => {
    const t = (n) => `${String(Math.floor(n / 3600)).padStart(2, '0')}:${String(Math.floor((n % 3600) / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}.000`;
    return `${t(i * 4)} --> ${t(i * 4 + 4)}\nPart ${i}: photosynthesis turns <c>light</c> into chemical energy in the chloroplasts of plant cells.`;
  });
  const vtt = `WEBVTT\n\n${lines.join('\n\n')}\n`;
  const up = await http('POST', `/youtube-sessions/${sess.id}/transcript/captions`, token, null, file('lesson.vtt', vtt));
  check('a VTT caption file (> 100 KB) becomes the transcript with timestamp segments',
    up.status === 201 && up.json.transcriptStatus === 'ready' && up.json.transcriptSource === 'captions' && up.json.segmentCount === 900 && up.json.transcriptErrorCode === null,
    `${up.status} ${vtt.length} bytes, ${up.json?.segmentCount} segments`);
  const detail = await http('GET', `/youtube-sessions/${sess.id}`, token);
  check('markup is stripped from cues', detail.json.segments[0].text.startsWith('Part 0: photosynthesis turns light into'), detail.json.segments[0].text.slice(0, 40));
  const srt = '1\r\n00:00:00,500 --> 00:00:02,000\r\nHello there, this is a short SubRip caption file\r\n\r\n2\r\n00:01:05,000 --> 00:01:06,000\r\nwith a second cue\r\n';
  const s2 = (await http('POST', '/youtube-sessions', token, { url: 'https://www.youtube.com/watch?v=aaaaaaaaaaa' })).json;
  const upSrt = await http('POST', `/youtube-sessions/${s2.id}/transcript/captions`, token, null, file('c.srt', srt));
  check('an SRT caption file works too', upSrt.status === 201 && upSrt.json.segmentCount === 2, `${upSrt.status}`);
  const other = await http('POST', `/youtube-sessions/${s2.id}/transcript/captions`, (await http('POST', '/auth/signup', null, { fullName: 'YT Other', username: `yt2_${stamp}`, email: `yt2.${stamp}@example.test`, password: 'Yt-Probe-1!', confirmPassword: 'Yt-Probe-1!' })).json.accessToken, null, file('c.srt', srt));
  check("another learner cannot upload to this learner's session (404)", other.status === 404, `${other.status}`);

  // ------------------------------------------------------------ condensed once, reused for the next kind
  const before = await nimCalls();
  const g1 = await http('POST', '/learning/generate', token, { requestId: crypto.randomUUID(), kind: 'summary', sourceType: 'youtube', sourceId: sess.id });
  const afterFirst = await nimCalls();
  const row = (await db.query(`SELECT "structuredMaterial" sm FROM youtube_resources WHERE id = $1`, [sess.id])).rows[0].sm;
  check('first generation condenses the long transcript (several model calls) and keeps the condensed version',
    g1.status === 201 && afterFirst - before > 2 && typeof row.condensed?.text === 'string' && row.condensed.hash?.length === 64 && row.session?.transcriptSource === 'captions',
    `${g1.status} ${afterFirst - before} calls`);
  await sleep(3200);
  const g2 = await http('POST', '/learning/generate', token, { requestId: crypto.randomUUID(), kind: 'notes', sourceType: 'youtube', sourceId: sess.id });
  const afterSecond = await nimCalls();
  check('the next kind for the same video reuses it: exactly one model call', g2.status === 201 && afterSecond - afterFirst === 1, `${g2.status} ${afterSecond - afterFirst} calls`);
  const view = (await http('GET', `/youtube-sessions/${sess.id}`, token)).json;
  check('the session view does not expose the cached text', !JSON.stringify(view).includes('"condensed"'));

  // a new transcript invalidates the cache (hash mismatch → condensed again)
  await http('PUT', `/youtube-sessions/${sess.id}/transcript`, token, { text: vtt.replace(/Part/g, 'Section').slice(0, 60_000) });
  await sleep(3200);
  const b3 = await nimCalls();
  const g3 = await http('POST', '/learning/generate', token, { requestId: crypto.randomUUID(), kind: 'key_concepts', sourceType: 'youtube', sourceId: sess.id });
  check('after the transcript changes, it is condensed again (no stale reuse)', g3.status === 201 && (await nimCalls()) - b3 > 1, `${g3.status}`);
} finally {
  await db.end();
}
console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exit(failed ? 1 : 0);
