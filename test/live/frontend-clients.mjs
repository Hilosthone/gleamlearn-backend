// LIVE: drives the REAL frontend API clients (src/lib/api.ts, src/lib/admin-api.ts) against the locally running
// backend (disposable e2e database). Proves the frontend request shapes match the backend, not just endpoint names.
// Usage: node live_frontend_clients.mjs <frontend repo> <backend repo>
// Never prints tokens, codes or passwords.
import fs from 'fs';
import path from 'path';
import os from 'os';
import { pathToFileURL } from 'url';

const [FRONTEND, BACKEND] = process.argv.slice(2);
process.env.NEXT_PUBLIC_API_URL = 'http://127.0.0.1:5055/api/v1';
const MAIL_DIR = process.env.E2E_MAIL_DIR || path.join(os.tmpdir(), 'gleamlearn-e2e-mail');
const env = Object.fromEntries(
  fs.readFileSync(path.join(BACKEND, '.env'), 'utf8').split(/\r?\n/).filter((l) => l && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
);

// Browser shims used by lib/session.ts
const store = new Map();
globalThis.window = {
  localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
  dispatchEvent: () => true,
};

const load = (rel) => import(pathToFileURL(path.join(FRONTEND, rel)).href);
const { authApi } = await load('src/lib/api.ts');
const { adminAuthApi, adminContentApi, adminUsersApi, adminDashboardApi } = await load('src/lib/admin-api.ts');

const results = [];
let failed = 0;
const check = (name, cond, detail = '') => { results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); if (!cond) failed++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const attempt = async (fn) => { await sleep(1300); try { return { ok: true, value: await fn() }; } catch (e) { return { ok: false, error: e }; } };
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

const stamp = Date.now();
const email = `e2e.client.${stamp}@example.test`;
const password = 'Client-Pass-123!';

let since = Date.now() * 1e6;
let r = await attempt(() => authApi.signup({ fullName: 'E2E Client', username: `e2ec_${stamp}`, email, password, confirmPassword: password, educationType: 'Secondary' }));
check('authApi.signup', r.ok, r.ok ? '' : r.error.message);
await sleep(1000);
let code = codeFor(email, 'verif', since);
r = await attempt(() => authApi.verifyEmail({ email, token: code }));
check('authApi.verifyEmail({ email, token })', r.ok, r.ok ? '' : r.error.message);
r = await attempt(() => authApi.login({ email, password }));
check('authApi.login returns accessToken', r.ok && typeof r.value?.accessToken === 'string', r.ok ? '' : r.error.message);
const learnerToken = r.value?.accessToken;
r = await attempt(() => authApi.getMe(learnerToken));
check('authApi.getMe', r.ok && r.value?.data?.email === email, r.ok ? '' : r.error.message);

// forgot/reset are throttled to 3 requests per minute per IP: let any earlier run's window expire
await sleep(61000);
since = Date.now() * 1e6;
r = await attempt(() => authApi.forgotPassword({ email }));
check('authApi.forgotPassword', r.ok, r.ok ? '' : r.error.message);
await sleep(1500);
code = codeFor(email, 'reset', since);
await sleep(2500);
const next = 'Client-Pass-456!';
r = await attempt(() => authApi.resetPassword({ email, token: code, newPassword: next, confirmNewPassword: next }));
check('authApi.resetPassword({ email, token, … }) (reset page payload)', r.ok, r.ok ? '' : r.error.message);
r = await attempt(() => authApi.changePassword({ oldPassword: next, newPassword: password, confirmNewPassword: password }, learnerToken));
check('authApi.changePassword (settings form payload)', r.ok, r.ok ? '' : r.error.message);

r = await attempt(() => adminAuthApi.login(env.SUPER_ADMIN_EMAIL, env.SUPER_ADMIN_PASSWORD));
check('adminAuthApi.login stores the admin token separately', r.ok && store.has('gleamlearn.adminAccessToken') && !store.has('accessToken'), r.ok ? '' : r.error.message);
r = await attempt(() => adminAuthApi.me());
check('adminAuthApi.me has permissions', r.ok && Array.isArray(r.value?.data?.permissions), r.ok ? '' : r.error.message);
r = await attempt(() => adminDashboardApi.counts());
check('adminDashboardApi.counts (verified counts)', r.ok && typeof r.value?.data?.counts?.learners === 'number', r.ok ? JSON.stringify(r.value?.data?.unavailable ?? []) : r.error.message);
r = await attempt(() => adminUsersApi.list({ search: email }));
const user = r.value?.data?.users?.[0];
check('adminUsersApi.list finds the learner', r.ok && user?.email === email, r.ok ? '' : r.error.message);
check('admin user record has no secrets', user && !('passwordHash' in user) && !('verificationOtp' in user));
r = await attempt(() => adminUsersApi.setRestricted(user.id, true, 'E2E check'));
check('adminUsersApi.setRestricted(true, reason)', r.ok && r.value?.data?.isRestricted === true, r.ok ? '' : r.error.message);
r = await attempt(() => authApi.getMe(learnerToken));
check('restricted learner: authApi.getMe → ApiError forbidden, code ACCOUNT_RESTRICTED', !r.ok && r.error.kind === 'forbidden' && r.error.code === 'ACCOUNT_RESTRICTED', r.ok ? 'unexpected success' : `${r.error.kind}/${r.error.code}`);
r = await attempt(() => adminUsersApi.setRestricted(user.id, false));
check('adminUsersApi.setRestricted(false)', r.ok, r.ok ? '' : r.error.message);
r = await attempt(() => adminUsersApi.setSuspended(user.id, true));
check('adminUsersApi.setSuspended(true)', r.ok && r.value?.data?.isRestricted === true, r.ok ? '' : r.error.message);
r = await attempt(() => adminUsersApi.setRestricted(user.id, false));
check('lift suspension', r.ok, r.ok ? '' : r.error.message);

r = await attempt(() => adminContentApi.createCourse({ title: `Client Course ${stamp}`, track: 'Secondary', level: 'SS 1' }));
check('adminContentApi.createCourse', r.ok && r.value?.data?.id, r.ok ? '' : r.error.message);
const courseId = r.value?.data?.id;
r = await attempt(() => adminContentApi.listCourses({ search: `Client Course ${stamp}` }));
check('adminContentApi.listCourses search', r.ok && r.value?.data?.courses?.length === 1 && r.value.data.courses[0].topicCount === 0, r.ok ? '' : r.error.message);
r = await attempt(() => adminContentApi.updateCourse(courseId, { description: 'Updated from the admin client' }));
check('adminContentApi.updateCourse (partial)', r.ok && r.value?.data?.description === 'Updated from the admin client', r.ok ? '' : r.error.message);
r = await attempt(() => adminContentApi.updateCourse(courseId, {}));
check('empty update → ApiError validation (400)', !r.ok && r.error.status === 400, r.ok ? 'unexpected success' : String(r.error.status));
r = await attempt(() => adminContentApi.createTopic(courseId, { title: 'Topic A', order: 2 }));
const topicId = r.value?.data?.id;
check('adminContentApi.createTopic', r.ok && topicId, r.ok ? '' : r.error.message);
r = await attempt(() => adminContentApi.updateTopic(topicId, { order: 1 }));
check('adminContentApi.updateTopic', r.ok && r.value?.data?.order === 1, r.ok ? '' : r.error.message);
r = await attempt(() => adminContentApi.createLesson(courseId, { title: 'Lesson A', content: '# Heading\n\n- item' }));
const lessonId = r.value?.data?.id;
check('adminContentApi.createLesson', r.ok && lessonId, r.ok ? '' : r.error.message);
r = await attempt(() => adminContentApi.updateLesson(lessonId, { orderIndex: 3 }));
check('adminContentApi.updateLesson', r.ok && r.value?.data?.orderIndex === 3, r.ok ? '' : r.error.message);
r = await attempt(() => adminContentApi.getCourse(courseId));
check('adminContentApi.getCourse has 1 topic, 1 lesson', r.ok && r.value?.data?.topics?.length === 1 && r.value?.data?.lessons?.length === 1, r.ok ? '' : r.error.message);
r = await attempt(() => adminContentApi.deleteCourse(courseId));
check('deleteCourse on a non-empty course → ApiError conflict (409)', !r.ok && r.error.kind === 'conflict', r.ok ? 'unexpected success' : r.error.kind);
r = await attempt(() => adminContentApi.deleteLesson(lessonId));
check('adminContentApi.deleteLesson', r.ok, r.ok ? '' : r.error.message);
r = await attempt(() => adminContentApi.deleteTopic(topicId));
check('adminContentApi.deleteTopic', r.ok, r.ok ? '' : r.error.message);
r = await attempt(() => adminContentApi.deleteCourse(courseId));
check('adminContentApi.deleteCourse (now empty)', r.ok, r.ok ? '' : r.error.message);
r = await attempt(() => adminContentApi.getCourse(courseId));
check('deleted course → ApiError not_found', !r.ok && r.error.kind === 'not_found', r.ok ? 'unexpected success' : r.error.kind);

console.log(results.join('\n'));
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
