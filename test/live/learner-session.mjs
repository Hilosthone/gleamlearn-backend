// LIVE (Phase 2): the REAL frontend learner modules (src/lib/learner-auth.ts, onboarding-profile.ts, api.ts)
// against the running backend on the disposable database. Also checks the ownership fixes over HTTP.
// Usage: node test/live/learner-session.mjs <frontend repo>
// Never prints tokens, codes or passwords.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';

const [FRONTEND] = process.argv.slice(2);
const BASE = 'http://127.0.0.1:5055/api/v1';
process.env.NEXT_PUBLIC_API_URL = BASE;
const MAIL_DIR = process.env.E2E_MAIL_DIR || path.join(os.tmpdir(), 'gleamlearn-e2e-mail');

const store = new Map();
globalThis.window = {
  localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
  dispatchEvent: () => true,
};
const load = (rel) => import(pathToFileURL(path.join(FRONTEND, rel)).href);
const auth = await load('src/lib/learner-auth.ts');
const { buildOnboardingRequests } = await load('src/lib/onboarding-profile.ts');
const { usersApi, aiCompanionApi } = await load('src/lib/api.ts');

const results = [];
let failed = 0;
const check = (name, cond, detail = '') => { results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); if (!cond) failed++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const attempt = async (fn, wait = 3200) => { await sleep(wait); try { return { ok: true, value: await fn() }; } catch (e) { return { ok: false, error: e }; } };
const codeFor = (email, hint, since) => {
  const key = email.replace('@', '_at_');
  for (const f of fs.readdirSync(MAIL_DIR).filter((f) => f.includes(key) && Number(f.split('_')[0]) >= since).sort().reverse()) {
    const raw = fs.readFileSync(path.join(MAIL_DIR, f), 'utf8').replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
    if (!new RegExp(hint, 'i').test(raw)) continue;
    const m = raw.match(/token=(\d{6})/) || raw.match(/\b(\d{6})\b/);
    if (m) return m[1];
  }
  return null;
};
const raw = async (method, p, token, body) => {
  await sleep(3200);
  const res = await fetch(BASE + p, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  let json = null; try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, json };
};

const stamp = Date.now();
const email = `e2e.session.${stamp}@example.test`;
const password = 'Session-Pass-1!';

// ---------- sign-up → verify → sign-in → session ----------
let since = Date.now() * 1e6;
let r = await attempt(() => auth.signUp({ fullName: 'E2E Session', username: `e2es_${stamp}`, email, password, confirmPassword: password }));
check('signUp stores a learner session', r.ok && auth.hasLearnerSession(), r.ok ? '' : r.error.message);
await sleep(1000);
r = await attempt(() => auth.verifyEmail(email, codeFor(email, 'verif', since)));
check('verifyEmail(email, code)', r.ok, r.ok ? '' : r.error.message);
r = await attempt(() => auth.signIn(email, 'wrong-password'));
check('signIn wrong password → message does not reveal account existence', !r.ok && auth.signInErrorMessage(r.error) === 'Incorrect email or password.', r.ok ? 'unexpected success' : r.error.message);
r = await attempt(() => auth.signIn(email, password));
check('signIn → accountStatus active', r.ok && r.value.accountStatus === 'active', r.ok ? '' : r.error.message);
r = await attempt(() => auth.fetchCurrentLearner());
check('fetchCurrentLearner (GET /auth/me) → user + accountStatus', r.ok && r.value.user.email === email && r.value.accountStatus === 'active', r.ok ? '' : r.error.message);
const token = store.get('accessToken');

// ---------- onboarding saves what the backend stores ----------
const req = buildOnboardingRequests({
  eduType: 'university',
  academic: { institution: 'E2E University', facultyOrClass: 'Technology', departmentOrSubject: 'CSE', levelOrTerm: '200 Level', semester: 'First Semester' },
  preferences: { speed: 'balanced', studyTime: 'Evening', duration: '30 mins', explanationStyle: 'mixed' },
  goal: { goal: 'Master my courses', targetScore: 'A', targetDate: 'End of Semester' },
  companion: { name: 'Gleam AI', gender: 'Neutral', personality: 'Encouraging', teachingStyle: 'Socratic', voice: 'Friendly', appearance: 'Hologram' },
});
r = await attempt(() => usersApi.updateAcademicProfile(req.academicProfile));
check('onboarding academic profile saved (levelOrClass → level)', r.ok && r.value.data?.university === 'E2E University' && r.value.data?.level === '200 Level', r.ok ? '' : r.error.message);
r = await attempt(() => usersApi.updatePreferences(req.preferences));
check('onboarding study time saved', r.ok && r.value.data?.preferredStudyTime === 'Evening', r.ok ? '' : r.error.message);
r = await attempt(() => usersApi.updatePreferences({ preferredLearningPace: 'fast' }));
check('unsupported preference → 200 with notStored (was 500)', r.ok && JSON.stringify(r.value.notStored) === '["preferredLearningPace"]', r.ok ? '' : r.error.message);
r = await attempt(() => aiCompanionApi.createAiCompanion({ ...req.companion, userId: '00000000-0000-4000-8000-000000000000' }));
check('AI companion created for the caller even if the body names another userId', r.ok && r.value.data?.name === 'Gleam AI', r.ok ? '' : r.error.message);
r = await attempt(() => usersApi.getMe());
const meData = r.value?.data ?? r.value ?? {};
check('GET /users/me returns no OTP / refresh token / password hash', r.ok && !['passwordHash', 'verificationOtp', 'otpExpiresAt', 'refreshToken'].some((k) => k in meData), r.ok ? Object.keys(meData).filter((k) => /otp|token|hash/i.test(k)).join(',') : r.error.message);

// ---------- ownership over HTTP: a second learner ----------
const other = { email: `e2e.other.${stamp}@example.test`, password: 'Other-Pass-1!' };
const signupOther = await raw('POST', '/auth/signup', null, { fullName: 'Other', username: `e2eo_${stamp}`, ...other, confirmPassword: other.password });
const otherToken = signupOther.json?.accessToken;
check('second learner signed up', signupOther.status === 201 && typeof otherToken === 'string', `status ${signupOther.status}`);
let x = await raw('POST', '/exam-prep', otherToken, { title: 'Other plan', examType: 'JAMB', subjects: ['Physics'], targetDate: '2027-05-01' });
check('exam-prep create → 201 (it failed with 500 before: NOT NULL userId)', x.status === 201, `status ${x.status}`);
const otherPlanId = x.json?.id;
x = await raw('GET', '/exam-prep', token);
check("exam-prep list does not include another learner's plan", x.status === 200 && Array.isArray(x.json) && !JSON.stringify(x.json).includes(otherPlanId ?? 'none'), `status ${x.status}`);
x = await raw('GET', `/exam-prep/${otherPlanId}`, token);
check("another learner's plan → 404", x.status === 404, `status ${x.status}`);
x = await raw('PATCH', `/exam-prep/${otherPlanId}`, token, { title: 'hijack' });
check("PATCH another learner's plan → 404", x.status === 404, `status ${x.status}`);
await sleep(5200);
x = await raw('DELETE', `/exam-prep/${otherPlanId}`, token);
check("DELETE another learner's plan → 404", x.status === 404, `status ${x.status}`);
x = await raw('GET', `/exam-prep/${otherPlanId}`, otherToken);
check('the owner still has the plan, unchanged', x.status === 200 && x.json?.studyPlan?.title === 'Other plan', `status ${x.status}`);

const victimNote = await raw('POST', '/notes', otherToken, { title: 'Victim note', content: 'secret' });
const myNote = await raw('POST', '/notes', token, { title: 'My note', content: 'mine' });
check('notes created for both learners', victimNote.status === 201 && myNote.status === 201, `${victimNote.status}/${myNote.status}`);
x = await raw('PATCH', `/notes/${myNote.json?.id}`, token, { id: victimNote.json?.id, title: 'hijacked', content: 'overwritten' });
const victimAfter = await raw('GET', `/notes/${victimNote.json?.id}`, otherToken);
check("`id` in a note update body cannot overwrite another learner's note", victimAfter.status === 200 && victimAfter.json?.title === 'Victim note' && victimAfter.json?.content === 'secret', `victim title: ${victimAfter.json?.title}`);

// ---------- freeze / unfreeze / delete (account-state page calls) ----------
r = await attempt(() => usersApi.freezeAccount(), 5200);
check('freezeAccount', r.ok, r.ok ? '' : r.error.message);
r = await attempt(() => auth.fetchCurrentLearner());
check('frozen: GET /auth/me still works and reports accountStatus frozen', r.ok && r.value.accountStatus === 'frozen', r.ok ? '' : r.error.message);
const frozenProbe = await raw('GET', '/notes', token);
check('frozen: other routes → 403 ACCOUNT_FROZEN', frozenProbe.status === 403 && frozenProbe.json?.code === 'ACCOUNT_FROZEN', `status ${frozenProbe.status}`);
r = await attempt(() => auth.signIn(email, password), 5200);
check('frozen: sign-in allowed with accountStatus frozen', r.ok && r.value.accountStatus === 'frozen', r.ok ? '' : r.error.message);
r = await attempt(() => usersApi.unfreezeAccount(), 5200);
check('unfreezeAccount', r.ok, r.ok ? '' : r.error.message);
r = await attempt(() => auth.fetchCurrentLearner());
check('after unfreeze: accountStatus active', r.ok && r.value.accountStatus === 'active', r.ok ? '' : r.error.message);
r = await attempt(() => usersApi.deleteMe('wrong-password'), 5200);
check('deleteMe with a wrong password → 400 "Incorrect password", account kept', !r.ok && r.error.status === 400 && /Incorrect password/.test(r.error.message), r.ok ? 'unexpected success' : `${r.error.status} ${r.error.message}`);
r = await attempt(() => usersApi.deleteMe(password), 5200);
check('deleteMe with the password → 2xx (soft delete)', r.ok, r.ok ? '' : r.error.message);
r = await attempt(() => auth.signIn(email, password));
check('deleted account cannot sign in (generic 401 message)', !r.ok && r.error.status === 401, r.ok ? 'unexpected success' : String(r.error.status));
await auth.signOut();
check('signOut leaves no learner token', !auth.hasLearnerSession());

console.log(results.join('\n'));
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
