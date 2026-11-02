// LIVE check of streaks, streak recovery and engagement rewards against the LOCAL backend (127.0.0.1:5055) and the
// DISPOSABLE local database gleamlearn_e2e. Past streak days are seeded directly into the test database (the server
// always uses the real clock). Refuses non-local hosts. Prints no secrets.
// Usage: node test/live/engagement-streaks.mjs   (start the backend with test/live/start-backend.mjs first)
import { createRequire } from 'module';
import fs from 'fs';

const BE = 'http://127.0.0.1:5055/api/v1';
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
const results = [];
const check = (name, ok, detail = '') => { results.push(ok); if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); };

async function http(method, path, token, body) {
  for (let i = 0; i < 6; i++) {
    const r = await fetch(`${BE}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (r.status !== 429) return { status: r.status, json: await r.json().catch(() => null) };
    await sleep(3200);
  }
  throw new Error(`${path} stayed throttled`);
}
const raw = async (method, path, token, body) => {
  const r = await fetch(`${BE}${path}`, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: r.status, json: await r.json().catch(() => null) };
};
const stamp = Date.now().toString(36);
async function learner(tag) {
  const s = await http('POST', '/auth/signup', null, { fullName: 'Streak Probe', username: `st_${tag}_${stamp}`, email: `st.${tag}.${stamp}@example.test`, password: 'Streak-Probe-1!', confirmPassword: 'Streak-Probe-1!' });
  const token = s.json.accessToken;
  const me = await http('GET', '/users/me', token);
  return { token, id: (me.json.data ?? me.json).id };
}
const lagosToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const plus = (d, n) => { const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const TODAY = lagosToday();
/** Seeds natural streak days and the matching user_streaks row (as if the learner had been active then). */
async function seed(id, days) {
  for (const d of days) await db.query(`INSERT INTO streak_history (id, "userId", "checkInDate", "activitySource", "createdAt") VALUES (gen_random_uuid(), $1, $2, 'seed', now())`, [id, d]);
  const last = days[days.length - 1];
  await db.query(
    `INSERT INTO user_streaks (id, "userId", "currentStreak", "longestStreak", "lastCheckInDate", "recoveryTokens", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $2, $3, 1, now(), now())`,
    [id, days.length, last],
  );
}
const xpSum = async (id, source) => Number((await db.query(`SELECT COALESCE(SUM(amount),0) s FROM xp_transactions WHERE "userId" = $1 AND source = $2`, [id, source])).rows[0].s);
const coinSum = async (id, source) => Number((await db.query(`SELECT COALESCE(SUM(amount),0) s FROM coin_transactions WHERE user_id = $1 AND source = $2`, [id, source])).rows[0].s);

try {
  // ---------------------------------------------------------------- daily visit
  const a = await learner('a');
  const [d1, d2] = await Promise.all([raw('POST', '/engagement/daily', a.token), raw('POST', '/engagement/daily', a.token)]);
  const ok = [d1, d2].filter((r) => r.status === 201);
  const granted = ok.filter((r) => r.json.reward.granted).length;
  check('two simultaneous first visits: one reward, both see the streak counted', ok.length >= 1 && granted === 1, `statuses ${d1.status}/${d2.status}, granted ${granted}`);
  await sleep(3200);
  const again = await http('POST', '/engagement/daily', a.token);
  check('a later visit the same day grants nothing more', again.status === 201 && again.json.reward.granted === false && again.json.streak.currentStreak === 1);
  check('daily reward credited once to the existing XP and coin ledgers (5 + 5)', (await xpSum(a.id, 'DAILY_VISIT')) === 5 && (await coinSum(a.id, 'DAILY_VISIT')) === 5);
  const notes = (await http('GET', '/notifications', a.token)).json;
  const welcome = JSON.stringify(notes).split('Welcome back!').length - 1;
  check('one in-app "Welcome back" notification', welcome === 1, `found ${welcome}`);
  const bal = await http('GET', '/coins', a.token);
  check('coin balance reads the ledger as a number', typeof bal.json?.balance === 'number' && bal.json.balance === 5, JSON.stringify(bal.json));

  // ---------------------------------------------------------------- one missed day → recover
  const b = await learner('b');
  await seed(b.id, [plus(TODAY, -6), plus(TODAY, -5), plus(TODAY, -4), plus(TODAY, -3), plus(TODAY, -2)]); // 5 days, missed yesterday
  const bv = await http('POST', '/engagement/daily', b.token);
  const r0 = bv.json.streak.recovery;
  check('return after one missed day: today counts and recovery is offered', bv.json.streak.currentStreak === 1 && r0.recoverable && r0.missedDays.join() === plus(TODAY, -1) && r0.remainingThisMonth === 4 && r0.brokenStreak === 5, JSON.stringify(r0));
  const bn = JSON.stringify((await http('GET', '/notifications', b.token)).json);
  check('the recovery prompt is in the notifications with the allowance', bn.includes('4 of 4 streak recoveries left this month'));
  await sleep(5200);
  const [x1, x2] = await Promise.all([raw('POST', '/streak/recover', b.token, { missedDate: plus(TODAY, -1) }), raw('POST', '/streak/recover', b.token, { missedDate: plus(TODAY, -1) })]);
  const recRows = Number((await db.query(`SELECT count(*) c FROM streak_recoveries WHERE user_id = $1`, [b.id])).rows[0].c);
  check('the same recovery sent twice at once: recorded once', recRows === 1 && [x1, x2].some((r) => r.status === 201), `rows ${recRows}, statuses ${x1.status}/${x2.status}`);
  const st = await http('GET', '/streak', b.token);
  check('streak restored: 5 old days + recovered day + today = 7; 3 recoveries left', st.json.currentStreak === 7 && st.json.recovery.remainingThisMonth === 3 && st.json.recoveryTokens === 3, JSON.stringify({ c: st.json.currentStreak, r: st.json.recovery.remainingThisMonth }));
  const cal = await http('GET', `/streak/calendar?month=${TODAY.slice(0, 7)}`, b.token);
  const kinds = Object.fromEntries((cal.json.days ?? []).map((d) => [d.date, d.kind]));
  check('calendar shows the recovered day apart from natural days', kinds[plus(TODAY, -1)] === 'recovered' && (kinds[TODAY] === 'active') && (TODAY.slice(0, 7) !== plus(TODAY, -2).slice(0, 7) || kinds[plus(TODAY, -2)] === 'active'), JSON.stringify(cal.json.days?.slice(-3)));
  const hist = await http('GET', '/streak/history', b.token);
  check('recovery history is recorded (audit)', hist.json.recoveries?.length === 1 && hist.json.recoveries[0].missedDate === plus(TODAY, -1) && hist.json.recoveries[0].streakBefore === 5);
  await sleep(5200);
  const noMore = await raw('POST', '/streak/recover', b.token, {});
  check('nothing left to recover → refused, allowance unchanged', noMore.status === 400 && Number((await db.query(`SELECT count(*) c FROM streak_recoveries WHERE user_id = $1`, [b.id])).rows[0].c) === 1, `status ${noMore.status}`);

  // ---------------------------------------------------------------- two missed days: one recovery per day
  const c = await learner('c');
  await seed(c.id, [plus(TODAY, -5), plus(TODAY, -4), plus(TODAY, -3)]); // missed -2 and -1
  const cv = await http('POST', '/engagement/daily', c.token);
  check('two missed days: both listed, recoverable', cv.json.streak.recovery.missedDays.length === 2 && cv.json.streak.recovery.recoverable);
  await sleep(5200);
  const c1 = await http('POST', '/streak/recover', c.token, { missedDate: plus(TODAY, -2) });
  check('first recovery restores only the oldest day; the streak is still 1 until the gap is closed', c1.status === 201 && c1.json.currentStreak === 1 && c1.json.recovery.missedDays.join() === plus(TODAY, -1), JSON.stringify({ s: c1.status, c: c1.json?.currentStreak }));
  await sleep(5200);
  const stale = await raw('POST', '/streak/recover', c.token, { missedDate: plus(TODAY, -2) });
  check('repeating the first request is harmless (already recovered, no second use)', stale.status === 201 && stale.json.recovery.remainingThisMonth === 3, `status ${stale.status}`);
  await sleep(5200);
  const c2 = await http('POST', '/streak/recover', c.token, { missedDate: plus(TODAY, -1) });
  check('second recovery closes the gap: 3 + 2 + today = 6; 2 recoveries used', c2.json.currentStreak === 6 && c2.json.recovery.remainingThisMonth === 2, JSON.stringify({ c: c2.json?.currentStreak, r: c2.json?.recovery?.remainingThisMonth }));

  // ---------------------------------------------------------------- allowance used up / gap too long
  const d = await learner('d');
  await seed(d.id, [plus(TODAY, -3), plus(TODAY, -2)]);
  for (let i = 0; i < 4; i++) await db.query(`INSERT INTO streak_recoveries (user_id, missed_date, recovered_on, month_key, streak_before) VALUES ($1, $2, $3, $4, 1)`, [d.id, plus(TODAY, -40 - i), plus(TODAY, -39 - i), TODAY.slice(0, 7)]);
  const dv = await http('POST', '/engagement/daily', d.token);
  check('four recoveries already used this month: not offered, explained', dv.json.streak.recovery.recoverable === false && dv.json.streak.recovery.reason === 'allowance_exhausted');
  await sleep(5200);
  const dr = await raw('POST', '/streak/recover', d.token, {});
  check('recovering anyway is refused with the reason', dr.status === 400 && /used all 4/.test(dr.json?.message ?? ''), dr.json?.message);
  const e = await learner('e');
  await seed(e.id, [plus(TODAY, -8)]);
  const ev = await http('POST', '/engagement/daily', e.token);
  check('a 7-day gap (more than 4) is not recoverable', ev.json.streak.recovery.recoverable === false && ev.json.streak.recovery.reason === 'gap_too_long' && ev.json.streak.currentStreak === 1);

  // ---------------------------------------------------------------- active-time heartbeats
  const hb = (token, active = true) => http('POST', '/engagement/heartbeat', token, { active });
  let h = await hb(a.token);
  check('first heartbeat only starts the clock', h.json.activeSecondsToday === 0 && h.json.rewards.length === 0);
  await db.query(`UPDATE engagement_days SET last_heartbeat_at = now() - interval '60 seconds', active_seconds = 560 WHERE user_id = $1`, [a.id]);
  await sleep(5200);
  h = await hb(a.token);
  const afterBlock = h.json.activeSecondsToday;
  // the heartbeat came ~65 s after the back-dated one (the test waits out the throttle): 560 + 60..75
  check('a heartbeat about a minute later credits that time and crosses 10 minutes: one reward', afterBlock >= 620 && afterBlock <= 635 && h.json.rewards.length === 1 && h.json.rewardedBlocksToday === 1, JSON.stringify({ s: h.json.activeSecondsToday, r: h.json.rewards.length }));
  check('the time reward reached the XP and coin ledgers (2 + 2)', (await xpSum(a.id, 'ACTIVE_TIME')) === 2 && (await coinSum(a.id, 'ACTIVE_TIME')) === 2);
  await db.query(`UPDATE engagement_days SET last_heartbeat_at = now() - interval '30 minutes' WHERE user_id = $1`, [a.id]);
  await sleep(5200);
  h = await hb(a.token);
  check('a heartbeat after a long gap (the learner left) credits nothing', h.json.activeSecondsToday === afterBlock, `${h.json.activeSecondsToday} vs ${afterBlock}`);
  await db.query(`UPDATE engagement_days SET last_heartbeat_at = now() - interval '60 seconds', active_seconds = 3590, rewarded_blocks = 1 WHERE user_id = $1`, [a.id]);
  await sleep(5200);
  const [h1, h2] = await Promise.all([raw('POST', '/engagement/heartbeat', a.token, { active: true }), raw('POST', '/engagement/heartbeat', a.token, { active: true })]);
  const blocks = Number((await db.query(`SELECT count(*) c FROM engagement_rewards WHERE user_id = $1 AND kind = 'active_time'`, [a.id])).rows[0].c);
  check('two heartbeats at once reaching the hour: blocks 2–6 granted exactly once each (cap 6)', blocks === 6 && [h1, h2].some((r) => r.status === 201 && r.json.capReached), `blocks ${blocks}`);
  check('ledgers: 6 × 2 XP and 6 × 2 coins of time rewards, nothing more', (await xpSum(a.id, 'ACTIVE_TIME')) === 12 && (await coinSum(a.id, 'ACTIVE_TIME')) === 12);
  await db.query(`UPDATE engagement_days SET last_heartbeat_at = now() - interval '60 seconds', active_seconds = 5000 WHERE user_id = $1`, [a.id]);
  await sleep(5200);
  h = await hb(a.token);
  check('after the daily cap, time is still counted but no reward is given', h.json.rewards.length === 0 && h.json.capReached && h.json.nextRewardInSeconds === null);
  await sleep(5200);
  await hb(a.token, false);
  const paused = (await db.query(`SELECT last_heartbeat_at FROM engagement_days WHERE user_id = $1`, [a.id])).rows[0].last_heartbeat_at;
  check('an inactive heartbeat stops the clock', paused === null);
  const unauth = await fetch(`${BE}/engagement/heartbeat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  check('heartbeats need a signed-in learner', unauth.status === 401);
  const injected = await http('POST', '/engagement/heartbeat', e.token, { active: true, seconds: 99999, xp: 1000 });
  check('amounts sent by the client are ignored', injected.json.activeSecondsToday === 0 && (await xpSum(e.id, 'ACTIVE_TIME')) === 0);
  const tlog = await http('GET', '/engagement/today', a.token);
  check('today’s summary reports the visit, the time and the rewards', tlog.json.dailyVisitRewarded === true && tlog.json.rewardedBlocksToday === 6 && tlog.json.recentRewards.length === 7);
} finally {
  await db.end();
}
console.log(`\n${results.filter(Boolean).length}/${results.length} checks passed`);
process.exitCode = failed ? 1 : 0;
