// LIVE (Phase 3): the REAL frontend learning module (src/lib/learning.ts) against the running backend.
// An admin publishes a disposable course; a disposable learner browses, enrols, studies and sees real progress and stats.
// Usage: node test/live/learner-learning.mjs <frontend repo>   (from the backend repo; prints no secrets)
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const [FRONTEND] = process.argv.slice(2);
const BASE = 'http://127.0.0.1:5055/api/v1';
process.env.NEXT_PUBLIC_API_URL = BASE;
const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8').split(/\r?\n/).filter((l) => l && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
);
const store = new Map();
globalThis.window = {
  localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
  dispatchEvent: () => true,
};
const load = (rel) => import(pathToFileURL(path.join(FRONTEND, rel)).href);
const auth = await load('src/lib/learner-auth.ts');
const L = await load('src/lib/learning.ts');

const results = [];
let failed = 0;
const check = (name, cond, detail = '') => { results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); if (!cond) failed++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const attempt = async (fn, wait = 2200) => { await sleep(wait); try { return { ok: true, value: await fn() }; } catch (e) { return { ok: false, error: e }; } };
const admin = async (method, p, token, body) => {
  await sleep(1300);
  const res = await fetch(BASE + p, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return res.json().catch(() => null);
};

const stamp = Date.now();
const adminToken = (await admin('POST', '/admin/auth/login', null, { email: env.SUPER_ADMIN_EMAIL, password: env.SUPER_ADMIN_PASSWORD }))?.accessToken;
const course = (await admin('POST', '/admin/content/courses', adminToken, { title: `Live Biology ${stamp}`, description: 'Cells and genetics', track: 'Secondary', level: 'SS 2' }))?.data;
await admin('POST', `/admin/content/courses/${course.id}/topics`, adminToken, { title: 'Cells', order: 1 });
const lessonIds = [];
for (const [i, title] of ['Cell structure', 'Cell division', 'Genetics'].entries()) {
  lessonIds.push((await admin('POST', `/admin/content/courses/${course.id}/lessons`, adminToken, { title, content: `Paragraph one of ${title}.\n\nParagraph two.`, orderIndex: i }))?.data?.id);
}
check('admin published a course with 1 topic and 3 lessons', Boolean(course?.id && lessonIds.every(Boolean)));

await sleep(1500);
let r = await attempt(() => auth.signUp({ fullName: 'Live Learner', username: `live_${stamp}`, email: `live.${stamp}@example.test`, password: 'Live-Pass-1!', confirmPassword: 'Live-Pass-1!' }));
check('learner signed up (session stored)', r.ok, r.ok ? '' : r.error.message);

r = await attempt(() => L.listCourses());
check('listCourses includes the published course', r.ok && r.value.some((c) => c.id === course.id), r.ok ? `${r.value.length} courses` : r.error.message);
r = await attempt(() => L.listCourses({ q: `Live Biology ${stamp}` }));
check('listCourses search (was 500 before)', r.ok && r.value.length === 1 && r.value[0].id === course.id, r.ok ? `${r.value.length}` : r.error.message);
r = await attempt(() => L.listCourses({ track: 'University' }));
check('track filter excludes the Secondary course', r.ok && !r.value.some((c) => c.id === course.id), r.ok ? '' : r.error.message);
r = await attempt(() => L.listCourses({ track: 'Secondary' }));
check('track filter includes it for Secondary', r.ok && r.value.some((c) => c.id === course.id), r.ok ? '' : r.error.message);

r = await attempt(() => L.getCourse(course.id));
check('getCourse with topics', r.ok && L.sortTopics(r.value.topics).length === 1, r.ok ? '' : r.error.message);
r = await attempt(() => L.listLessons(course.id));
const lessons = r.value ?? [];
check('listLessons in order', r.ok && lessons.map((l) => l.id).join() === lessonIds.join(), r.ok ? '' : r.error.message);

r = await attempt(() => L.listEnrolledCourses());
check('not enrolled yet', r.ok && !r.value.some((c) => c.id === course.id), r.ok ? '' : r.error.message);
r = await attempt(() => L.enroll(course.id));
check('enroll', r.ok, r.ok ? '' : r.error.message);
r = await attempt(() => L.listEnrolledCourses());
check('enrolled list includes it', r.ok && r.value.some((c) => c.id === course.id), r.ok ? '' : r.error.message);

r = await attempt(() => L.listLessonProgress(lessons));
let progress = r.value ?? {};
check('fresh progress: nothing completed', r.ok && L.courseCompletion(lessons, progress).completed === 0 && L.nextLessonToStudy(lessons, progress)?.id === lessonIds[0], r.ok ? '' : r.error.message);
r = await attempt(() => L.startLesson(lessonIds[0]));
check('startLesson records startedAt', r.ok && Boolean(r.value.startedAt), r.ok ? '' : r.error.message);
r = await attempt(() => L.completeLesson(lessonIds[0]));
check('completeLesson', r.ok && r.value.isCompleted, r.ok ? '' : r.error.message);
r = await attempt(() => L.listLessonProgress(lessons));
progress = r.value ?? {};
const completion = L.courseCompletion(lessons, progress);
check('course completion reflects the backend: 1 of 3', r.ok && completion.completed === 1 && completion.percent === 33, JSON.stringify(completion));
check('"continue" points at lesson 2', L.nextLessonToStudy(lessons, progress)?.id === lessonIds[1]);
r = await attempt(() => L.listEnrolledCourses());
const mine = r.value?.find((c) => c.id === course.id);
check('enrolled list progress is computed from lessons: 33% (was always 0)', r.ok && mine?.progressPercentage === 33, String(mine?.progressPercentage));
r = await attempt(() => L.getLesson(lessonIds[1]));
check('getLesson content → 2 plain-text paragraphs', r.ok && L.lessonParagraphs(r.value.content).length === 2, r.ok ? '' : r.error.message);

r = await attempt(() => L.loadLearnerStats());
check('stats: XP, coins and streak all load (streak was 500 before)', r.ok && r.value.xp && r.value.coins && r.value.streak, r.ok ? JSON.stringify({ xp: Boolean(r.value.xp), coins: Boolean(r.value.coins), streak: Boolean(r.value.streak) }) : r.error.message);
r = await attempt(() => L.studyMinutes());
check('study time loads (was 500 before)', r.ok && typeof r.value === 'number', r.ok ? String(r.value) : r.error.message);
r = await attempt(() => L.recentNotifications(3));
check('recent notifications (welcome notification from sign-up)', r.ok && r.value.length >= 1, r.ok ? `${r.value.length}` : r.error.message);

r = await attempt(() => L.unenroll(course.id));
check('unenroll', r.ok, r.ok ? '' : r.error.message);
r = await attempt(() => L.listEnrolledCourses());
check('enrolled list no longer includes it', r.ok && !r.value.some((c) => c.id === course.id), r.ok ? '' : r.error.message);

console.log(results.join('\n'));
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
