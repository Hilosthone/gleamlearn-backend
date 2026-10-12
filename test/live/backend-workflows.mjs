// LIVE HTTP verification against the locally running backend (disposable gleamlearn_e2e database).
// Uses a disposable learner (random e2e address) and the super admin seeded into the e2e database.
// Codes are read from the local SMTP sink's mail files and are never printed; neither are tokens or passwords.
// Run from the backend repo root: node <this file>
import fs from 'fs';
import path from 'path';
import os from 'os';


const BASE = process.env.E2E_BASE || 'http://127.0.0.1:5055/api/v1';
const MAIL_DIR = process.env.E2E_MAIL_DIR || path.join(os.tmpdir(), 'gleamlearn-e2e-mail');
const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8').split(/\r?\n/).filter((l) => l && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
);

const results = [];
let failed = 0;
function check(name, cond, detail = '') {
  results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!cond) failed++;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(method, p, { token, body } = {}) {
  // Respect the per-route throttles (1 request / 1–3 s on auth routes)
  await sleep(1200);
  const res = await fetch(BASE + p, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  try { json = await res.json(); } catch { /* empty body */ }
  return { status: res.status, json };
}

function latestCodeFor(email, subjectHint, notBefore) {
  const files = fs.existsSync(MAIL_DIR) ? fs.readdirSync(MAIL_DIR) : [];
  const key = email.replace('@', '_at_');
  const mine = files.filter((f) => f.includes(key) && Number(f.split('_')[0]) >= notBefore).sort();
  for (const f of mine.reverse()) {
    const raw = fs.readFileSync(path.join(MAIL_DIR, f), 'utf8');
    const decoded = raw.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
    if (subjectHint && !new RegExp(subjectHint, 'i').test(decoded)) continue;
    const m = decoded.match(/token=(\d{6})/) || decoded.match(/\b(\d{6})\b/);
    if (m) return m[1];
  }
  return null;
}
// Mail files are named by the sink with a nanosecond timestamp
const nowNs = () => Date.now() * 1e6;

const stamp = Date.now();
const learner = { email: `e2e.learner.${stamp}@example.test`, username: `e2e_${stamp}`, password: 'E2e-Pass-123!', fullName: 'E2E Learner' };

// ---------- learner: register → verify → login → profile ----------
let t0 = nowNs();
let r = await call('POST', '/auth/signup', { body: { ...learner, confirmPassword: learner.password, educationType: 'University' } });
check('signup → 201', r.status === 201, `status ${r.status}`);
check('signup response has no passwordHash/OTP', !JSON.stringify(r.json ?? {}).match(/passwordHash|verificationOtp/));
await sleep(1000);
let code = latestCodeFor(learner.email, 'verif', t0);
check('verification email captured by local sink', Boolean(code));

r = await call('POST', '/auth/verify-email', { body: { token: code } });
check('verify-email without email → 400 (code alone no longer accepted)', r.status === 400, `status ${r.status}`);
r = await call('POST', '/auth/verify-email', { body: { email: learner.email, token: code === '000000' ? '111111' : '000000' } });
check('verify-email with wrong code → 400', r.status === 400, `status ${r.status}`);
r = await call('POST', '/auth/verify-email', { body: { email: learner.email, token: code } });
check('verify-email with email + code → 2xx', r.status < 300, `status ${r.status}`);

r = await call('POST', '/auth/login', { body: { email: learner.email, password: 'wrong-password' } });
check('login with wrong password → 401', r.status === 401, `status ${r.status}`);
r = await call('POST', '/auth/login', { body: { email: learner.email, password: learner.password } });
check('login → 2xx with accessToken', r.status < 300 && typeof r.json?.accessToken === 'string', `status ${r.status}`);
let learnerToken = r.json?.accessToken;
check('login accountStatus is active', r.json?.accountStatus === 'active', String(r.json?.accountStatus));

r = await call('GET', '/auth/me', { token: learnerToken });
check('GET /auth/me → 200, own email, no secrets', r.status === 200 && r.json?.data?.email === learner.email && !JSON.stringify(r.json).match(/passwordHash|verificationOtp/), `status ${r.status}`);
const learnerId = r.json?.data?.id;
r = await call('GET', '/users/me', { token: learnerToken });
check('GET /users/me → 200', r.status === 200, `status ${r.status}`);
r = await call('GET', '/auth/me');
check('GET /auth/me without token → 401', r.status === 401, `status ${r.status}`);
r = await call('GET', '/auth/me', { token: learnerToken.slice(0, -4) + 'abcd' });
check('GET /auth/me with tampered token → 401', r.status === 401, `status ${r.status}`);

// ---------- catalog write authorization (Phase 1 fix) ----------
r = await call('POST', '/courses', { token: learnerToken, body: { title: 'Learner course', track: 'University' } });
check('learner POST /courses → 401 (admin-only now)', r.status === 401, `status ${r.status}`);
r = await call('POST', '/institutions', { token: learnerToken, body: { name: 'X', type: 'University' } });
check('learner POST /institutions → 401 (admin-only now)', r.status === 401, `status ${r.status}`);
r = await call('GET', '/courses', { token: learnerToken });
check('learner GET /courses still → 200', r.status === 200, `status ${r.status}`);

r = await call('POST', '/xp/award', { token: learnerToken, body: { userId: 'anyone', amount: 1000000, source: 'SELF_GRANT' } });
check('learner POST /xp/award → 401 (admin-only now)', r.status === 401, `status ${r.status}`);
r = await call('GET', '/xp', { token: learnerToken });
check('learner GET /xp still → 200', r.status === 200, `status ${r.status}`);

// ---------- admin: login → me → permitted operations ----------
r = await call('POST', '/admin/auth/login', { body: { email: env.SUPER_ADMIN_EMAIL, password: env.SUPER_ADMIN_PASSWORD } });
check('admin login (seeded super admin) → 2xx with accessToken', r.status < 300 && typeof r.json?.accessToken === 'string', `status ${r.status}`);
const adminToken = r.json?.accessToken;
r = await call('GET', '/admin/auth/me', { token: adminToken });
check('GET /admin/auth/me → 200 with content.manage', r.status === 200 && (r.json?.data?.permissions ?? []).includes('content.manage'), `status ${r.status}`);
r = await call('GET', '/admin/auth/me', { token: learnerToken });
check('learner token on /admin/auth/me → 401', r.status === 401, `status ${r.status}`);
r = await call('GET', '/auth/me', { token: adminToken });
check('admin token on learner /auth/me → 401 (tokens separated)', r.status === 401, `status ${r.status}`);

r = await call('POST', '/admin/content/courses', { token: adminToken, body: { title: `E2E Biology ${stamp}`, track: 'University', level: '100L' } });
check('admin creates course via /admin/content → 2xx', r.status < 300 && r.json?.data?.id, `status ${r.status}`);
const courseId = r.json?.data?.id;
r = await call('POST', '/courses', { token: adminToken, body: { title: `E2E Legacy ${stamp}`, track: 'University', id: '00000000-0000-4000-8000-000000000000' } });
check('admin creates course via legacy POST /courses → 2xx; injected id ignored', r.status < 300 && r.json?.id && r.json.id !== '00000000-0000-4000-8000-000000000000', `status ${r.status}`);
const legacyCourseId = r.json?.id;
r = await call('POST', `/admin/content/courses/${courseId}/topics`, { token: adminToken, body: { title: 'Cells', order: 1 } });
check('admin creates topic → 2xx', r.status < 300, `status ${r.status}`);
const topicId = r.json?.data?.id;
r = await call('POST', `/admin/content/courses/${courseId}/lessons`, { token: adminToken, body: { title: 'Lesson 1', content: 'Intro', orderIndex: 0 } });
check('admin creates lesson → 2xx', r.status < 300, `status ${r.status}`);
const lessonId = r.json?.data?.id;

// ---------- learner: course list → details → enroll → progress ----------
r = await call('GET', '/courses', { token: learnerToken });
check('learner sees the new course in GET /courses', r.status === 200 && JSON.stringify(r.json).includes(courseId ?? 'missing'), `status ${r.status}`);
r = await call('GET', `/courses/${courseId}`, { token: learnerToken });
check('learner GET /courses/:id → 200', r.status === 200, `status ${r.status}`);
r = await call('GET', `/courses/${courseId}/lessons`, { token: learnerToken });
check('learner GET /courses/:id/lessons → 200 with the lesson', r.status === 200 && JSON.stringify(r.json).includes(lessonId ?? 'missing'), `status ${r.status}`);
r = await call('POST', `/courses/${courseId}/enroll`, { token: learnerToken });
check('learner enrolls → 2xx', r.status < 300, `status ${r.status}`);
r = await call('GET', '/users/me/courses', { token: learnerToken });
check('learner enrolled courses include it', r.status === 200 && JSON.stringify(r.json).includes(courseId ?? 'missing'), `status ${r.status}`);
r = await call('POST', `/lessons/${lessonId}/start`, { token: learnerToken });
check('learner starts lesson → 2xx', r.status < 300, `status ${r.status}`);
r = await call('POST', `/lessons/${lessonId}/complete`, { token: learnerToken });
check('learner completes lesson → 2xx', r.status < 300, `status ${r.status}`);
r = await call('GET', `/lessons/${lessonId}/progress`, { token: learnerToken });
check('learner lesson progress → 200', r.status === 200, `status ${r.status}`);

// ---------- safe deletes ----------
r = await call('DELETE', `/admin/content/courses/${courseId}`, { token: adminToken });
check('admin delete of course with enrollments → 409', r.status === 409, `status ${r.status}`);
r = await call('DELETE', `/courses/${courseId}`, { token: adminToken });
check('legacy DELETE /courses/:id with enrollments → 409 (no cascade)', r.status === 409, `status ${r.status}`);
r = await call('DELETE', `/admin/content/lessons/${lessonId}`, { token: adminToken });
check('admin delete of lesson with progress → 409', r.status === 409, `status ${r.status}`);
await sleep(5500); // legacy DELETE /courses/:id is throttled to 1 request per 5 s
r = await call('DELETE', `/courses/${legacyCourseId}`, { token: adminToken });
check('legacy DELETE of an empty course → 2xx', r.status < 300, `status ${r.status}`);
r = await call('DELETE', `/admin/content/topics/${topicId}`, { token: adminToken });
check('admin delete of topic without progress → 2xx', r.status < 300, `status ${r.status}`);

// ---------- restriction enforcement ----------
r = await call('PATCH', `/admin/users/${learnerId}/suspend`, { token: adminToken });
check('admin suspends learner → 2xx', r.status < 300, `status ${r.status}`);
r = await call('GET', '/users/me', { token: learnerToken });
check('suspended learner existing token → 403 ACCOUNT_RESTRICTED', r.status === 403 && r.json?.code === 'ACCOUNT_RESTRICTED', `status ${r.status}`);
r = await call('POST', '/auth/login', { body: { email: learner.email, password: learner.password } });
check('suspended learner login → 403 ACCOUNT_RESTRICTED', r.status === 403 && r.json?.code === 'ACCOUNT_RESTRICTED', `status ${r.status}`);
r = await call('POST', `/admin/users/${learnerId}/unrestrict`, { token: adminToken });
check('admin lifts restriction → 2xx', r.status < 300, `status ${r.status}`);
r = await call('GET', '/users/me', { token: learnerToken });
check('learner token works again → 200', r.status === 200, `status ${r.status}`);

// ---------- password flows ----------
const newPassword = 'E2e-Pass-456!';
r = await call('POST', '/auth/change-password', { token: learnerToken, body: { oldPassword: 'wrong', newPassword, confirmNewPassword: newPassword } });
check('change-password with wrong old password → 401', r.status === 401, `status ${r.status}`);
r = await call('POST', '/auth/change-password', { token: learnerToken, body: { oldPassword: learner.password, newPassword, confirmNewPassword: newPassword } });
check('change-password → 2xx', r.status < 300, `status ${r.status}`);
t0 = nowNs();
r = await call('POST', '/auth/forgot-password', { body: { email: learner.email } });
check('forgot-password → 2xx', r.status < 300, `status ${r.status}`);
await sleep(1500);
code = latestCodeFor(learner.email, 'reset', t0);
check('reset email captured by local sink', Boolean(code));
const finalPassword = 'E2e-Pass-789!';
r = await call('POST', '/auth/reset-password', { body: { token: code, newPassword: finalPassword, confirmNewPassword: finalPassword } });
check('reset-password without email → 400', r.status === 400, `status ${r.status}`);
await sleep(2500);
r = await call('POST', '/auth/reset-password', { body: { email: learner.email, token: code, newPassword: finalPassword, confirmNewPassword: finalPassword } });
check('reset-password with email + code → 2xx', r.status < 300, `status ${r.status}`);
r = await call('POST', '/auth/login', { body: { email: learner.email, password: finalPassword } });
check('login with the reset password → 2xx', r.status < 300, `status ${r.status}`);
learnerToken = r.json?.accessToken;
r = await call('POST', '/auth/logout', { token: learnerToken });
check('logout → 2xx (stateless: the token itself stays valid until expiry)', r.status < 300, `status ${r.status}`);

// ---------- wrong-code limit (5 wrong codes clear the pending reset code) ----------
t0 = nowNs();
await sleep(20000); // forgot-password allows 3 requests/min per IP
r = await call('POST', '/auth/forgot-password', { body: { email: learner.email } });
await sleep(1500);
const goodCode = latestCodeFor(learner.email, 'reset', t0);
let lastStatusMsg = '';
for (let i = 0; i < 5; i++) {
  await sleep(21000); // reset-password allows 3 requests/min per IP
  const wrong = String(((Number(goodCode) - 100000 + 1 + i) % 900000) + 100000);
  r = await call('POST', '/auth/reset-password', { body: { email: learner.email, token: wrong, newPassword: 'X-Pass-000!', confirmNewPassword: 'X-Pass-000!' } });
  lastStatusMsg = `${r.status} ${typeof r.json?.message === 'string' ? r.json.message : ''}`;
}
check('5th wrong code → 400 "Too many incorrect codes"', lastStatusMsg.startsWith('400 Too many incorrect codes'), lastStatusMsg);
await sleep(21000);
r = await call('POST', '/auth/reset-password', { body: { email: learner.email, token: goodCode, newPassword: 'X-Pass-000!', confirmNewPassword: 'X-Pass-000!' } });
check('the correct code no longer works after the limit → 400', r.status === 400, `status ${r.status}`);

console.log(results.join('\n'));
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
