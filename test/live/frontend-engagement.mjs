// LIVE: the REAL frontend modules (src/lib/engagement.ts, gamification.ts, learning.ts, self-learning.ts) against the
// LOCAL backend (127.0.0.1:5055) and the DISPOSABLE database gleamlearn_e2e. Past streak days are seeded directly into
// the test database (the server always uses the real clock). Refuses non-local hosts. Prints no secrets.
// Usage (from the backend repo): node test/live/frontend-engagement.mjs <frontend repo>
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const [FRONTEND] = process.argv.slice(2);
process.env.NEXT_PUBLIC_API_URL = 'http://127.0.0.1:5055/api/v1';
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

const store = new Map();
const events = [];
globalThis.window = {
  localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
  dispatchEvent: (e) => { events.push(e); return true; },
};
const load = (rel) => import(pathToFileURL(path.join(FRONTEND, rel)).href);
const auth = await load('src/lib/learner-auth.ts');
const E = await load('src/lib/engagement.ts');
const G = await load('src/lib/gamification.ts');
const L = await load('src/lib/learning.ts');
const S = await load('src/lib/self-learning.ts');

let failed = 0;
const check = (name, ok, detail = '') => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** retries a throttled call (429) after the backend's short window */
async function call(fn) {
  for (let i = 0; i < 8; i++) {
    try { return await fn(); } catch (e) { if (e?.status !== 429) throw e; await sleep(3200); }
  }
  throw new Error('stayed throttled');
}
const lagosToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const plus = (d, n) => { const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const TODAY = lagosToday();
const stamp = Date.now().toString(36);

try {
  await call(() => auth.signUp({ fullName: 'FE Probe', username: `fe_${stamp}`, email: `fe.${stamp}@example.test`, password: 'Fe-Probe-1!', confirmPassword: 'Fe-Probe-1!' }));
  const me = await call(() => auth.fetchCurrentLearner());
  const userId = me.user.id;
  check('learner signed up through the frontend auth module', Boolean(userId));

  // a 5-day streak that ended the day before yesterday: yesterday was missed
  const days = [-6, -5, -4, -3, -2].map((n) => plus(TODAY, n));
  for (const d of days) await db.query(`INSERT INTO streak_history (id, "userId", "checkInDate", "activitySource", "createdAt") VALUES (gen_random_uuid(), $1, $2, 'seed', now())`, [userId, d]);
  await db.query(`INSERT INTO user_streaks (id, "userId", "currentStreak", "longestStreak", "lastCheckInDate", "recoveryTokens", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, 5, 5, $2, 1, now(), now())`, [userId, days[4]]);

  const visit = await call(() => E.recordDailyVisit());
  check('first visit of the day: streak counted, 5 XP + 5 coins (frontend parser)', visit.streakCounted && visit.reward?.xp === 5 && visit.reward?.coins === 5, JSON.stringify(visit.reward));
  check('the visit carries the recovery prompt for yesterday', visit.recovery?.recoverable === true && visit.recovery.nextMissedDay === plus(TODAY, -1) && G.recoveryMessage(visit.recovery)?.includes('4 of 4'), G.recoveryMessage(visit.recovery));
  await sleep(3200);
  const again = await call(() => E.recordDailyVisit());
  check('a second visit grants nothing (no second toast)', again.reward === null);

  L.invalidateLearnerStats();
  const stats = await call(() => L.sharedLearnerStats());
  check('shared stats (Navbar/dashboard) carry the recovery state; the dashboard banner shows', G.canRecoverStreak(stats.streak) && Boolean(G.recoveryMessage(stats.streak.recovery)));

  const rec = await call(() => G.recoverStreak(visit.recovery.nextMissedDay));
  check('recovering the missed day restores the streak (5 + recovered day + today = 7)', rec.currentStreak === 7, `${rec.currentStreak}`);
  const rec2 = await call(() => G.recoverStreak(visit.recovery.nextMissedDay));
  check('repeating the same recovery is harmless', rec2.currentStreak === 7);
  L.invalidateLearnerStats();
  const after = await call(() => L.sharedLearnerStats());
  check('afterwards nothing is missed and 3 of 4 recoveries remain', !G.recoveryMessage(after.streak.recovery) && after.streak.recovery.remainingThisMonth === 3 && !G.canRecoverStreak(after.streak));

  const month = TODAY.slice(0, 7);
  const cal = await call(() => G.loadStreakCalendar(plus(TODAY, -1).slice(0, 7)));
  const calBefore = await call(() => G.loadStreakCalendar(plus(TODAY, -2).slice(0, 7))); // may be the previous month
  check('calendar: the recovered day is marked recovered, natural days active', cal.kinds[plus(TODAY, -1)] === 'recovered' && calBefore.kinds[plus(TODAY, -2)] === 'active' && calBefore.kinds[plus(TODAY, -6)] === (plus(TODAY, -6).slice(0, 7) === calBefore.month ? 'active' : undefined), JSON.stringify(cal.kinds));
  if (plus(TODAY, -1).slice(0, 7) === month) check('calendar: today is active', cal.kinds[TODAY] === 'active');
  const hist = await call(() => G.loadRecoveryHistory());
  check('recovery history lists the day', hist.length === 1 && hist[0].missedDate === plus(TODAY, -1) && hist[0].recoveredOn === TODAY);

  const hb = await call(() => E.sendHeartbeat(true));
  check('heartbeat accepted (first beat starts the clock)', hb.activeSecondsToday === 0 && hb.maxBlocksPerDay === 6 && hb.rewards.length === 0, JSON.stringify({ s: hb.activeSecondsToday }));
  const today = await call(() => E.loadEngagementToday());
  check('today summary: visit rewarded, policy amounts from the server', today.dailyVisitRewarded && today.blockXp === 2 && today.blockCoins === 2 && today.maxBlocksPerDay === 6);

  // ------------------------------------------------------------ YouTube with a caption file
  const sess = await call(() => S.createYoutubeSession({ url: 'https://youtu.be/dQw4w9WgXcQ', title: 'FE probe video' }));
  check('session without a transcript names the reason (frontend parser)', sess.transcriptStatus === 'unavailable' && sess.transcriptErrorCode === 'DISABLED_ON_SERVER' && sess.transcriptRetryable === false && Boolean(S.TRANSCRIPT_FAILURE_TITLE[sess.transcriptErrorCode]));
  let threw = null;
  try { await S.uploadCaptions(sess.id, new File(['not captions'], 'notes.txt')); } catch (e) { threw = e.message; }
  check('a non-caption file is refused before uploading', /\.vtt|\.srt/.test(threw ?? ''), threw ?? 'no error');
  const vtt = 'WEBVTT\n\n00:00:01.000 --> 00:00:04.000\nPhotosynthesis is how plants make food from light.\n\n00:01:05.000 --> 00:01:08.000\nChlorophyll absorbs mostly red and blue light.\n';
  const up = await call(() => S.uploadCaptions(sess.id, new File([vtt], 'lesson.vtt', { type: 'text/vtt' })));
  check('caption upload through the frontend module (multipart) makes the transcript', up.transcriptStatus === 'ready' && up.transcriptSource === 'captions' && up.segmentCount === 2 && S.transcriptSourceLabel(up) === 'From your caption file');

  const notes = (await call(() => L.recentNotifications(10))).map((n) => n.message).join(' | ');
  check('in-app notifications hold the daily reward and the streak prompt', /5 XP and 5 coins/.test(notes) && /streak recoveries left this month/.test(notes));
} finally {
  await db.end();
}
console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exit(failed ? 1 : 0);
