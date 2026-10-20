// LIVE: measures how long sign-up, login, forgot-password and resend-verification take on the running backend.
// Run it with the backend's SMTP pointed at test/live/smtp_blackhole.py to prove auth never waits on email.
// Usage: node test/live/auth-timing.mjs [maxSeconds=5]   (prints statuses and durations only)
const BASE = process.env.E2E_BASE || 'http://127.0.0.1:5055/api/v1';
const LIMIT = Number(process.argv[2] || 5) * 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function timed(label, method, path, body, token) {
  const started = Date.now();
  const ctl = new AbortController();
  const guard = setTimeout(() => ctl.abort(), 150_000); // hard stop so a hang is reported, not waited on forever
  try {
    const res = await fetch(BASE + path, {
      method,
      signal: ctl.signal,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const json = await res.json().catch(() => null);
    return { label, status: res.status, ms: Date.now() - started, json };
  } catch (e) {
    return { label, status: e.name === 'AbortError' ? 'ABORTED after 150 s' : e.message, ms: Date.now() - started, json: null };
  } finally {
    clearTimeout(guard);
  }
}

const stamp = Date.now();
const email = `timing.${stamp}@example.test`;
const password = 'Timing-Pass-1!';
const rows = [];
rows.push(await timed('POST /auth/signup', 'POST', '/auth/signup', { fullName: 'Timing', username: `timing_${stamp}`, email, password, confirmPassword: password }));
await sleep(1500);
rows.push(await timed('POST /auth/login', 'POST', '/auth/login', { email, password }));
const token = rows.at(-1).json?.accessToken;
await sleep(1500);
rows.push(await timed('GET  /auth/me', 'GET', '/auth/me', null, token));
await sleep(2500);
rows.push(await timed('POST /auth/resend-verification', 'POST', '/auth/resend-verification', { email }));
await sleep(2500);
rows.push(await timed('POST /auth/forgot-password', 'POST', '/auth/forgot-password', { email }));

let failed = 0;
for (const r of rows) {
  const ok = typeof r.status === 'number' && r.status < 300 && r.ms <= LIMIT;
  if (!ok) failed++;
  const delivery = r.json?.verificationEmail ? `  verificationEmail=${r.json.verificationEmail}` : '';
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.label.padEnd(32)} → ${r.status} in ${(r.ms / 1000).toFixed(2)} s${delivery}`);
}
console.log(`\n${rows.length - failed}/${rows.length} completed within ${LIMIT / 1000} s`);
process.exit(failed ? 1 : 0);
