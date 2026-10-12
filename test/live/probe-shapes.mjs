// Prints the STRUCTURE (keys and value types, not values) of learner endpoints on the running e2e backend,
// so frontend types are written against real responses. Creates a disposable course/topic/lesson as the seeded admin.
// Usage: node test/live/probe-shapes.mjs   (from the backend repo; reads SUPER_ADMIN_* from .env, prints no secrets)
import fs from 'fs';

const BASE = 'http://127.0.0.1:5055/api/v1';
const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8').split(/\r?\n/).filter((l) => l && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(method, p, token, body) {
  await sleep(1300);
  const res = await fetch(BASE + p, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  let json = null; try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, json };
}
function shape(v, depth = 0) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return v.length ? `[${shape(v[0], depth + 1)}]×${v.length}` : '[]';
  if (typeof v === 'object') {
    if (depth > 3) return '{…}';
    return `{ ${Object.entries(v).map(([k, x]) => `${k}: ${shape(x, depth + 1)}`).join(', ')} }`;
  }
  return typeof v;
}

const admin = (await call('POST', '/admin/auth/login', null, { email: env.SUPER_ADMIN_EMAIL, password: env.SUPER_ADMIN_PASSWORD })).json?.accessToken;
const c = (await call('POST', '/admin/content/courses', admin, { title: 'Probe Course', description: 'd', track: 'University', level: '100L' })).json?.data;
const t = (await call('POST', `/admin/content/courses/${c.id}/topics`, admin, { title: 'Probe Topic', order: 1 })).json?.data;
const l = (await call('POST', `/admin/content/courses/${c.id}/lessons`, admin, { title: 'Probe Lesson', content: 'Hello', orderIndex: 0 })).json?.data;
const stamp = Date.now();
const learner = (await call('POST', '/auth/signup', null, { fullName: 'Shape Probe', username: `shape_${stamp}`, email: `shape.${stamp}@example.test`, password: 'Shape-123!', confirmPassword: 'Shape-123!' })).json?.accessToken;

const routes = [
  ['GET', '/courses'], ['GET', '/courses/search?q=Probe'], ['GET', `/courses/${c.id}`], ['GET', `/courses/${c.id}/topics`],
  ['GET', `/topics/${t.id}`], ['GET', `/courses/${c.id}/lessons`], ['POST', `/courses/${c.id}/enroll`], ['GET', '/users/me/courses'],
  ['GET', `/lessons/${l.id}`], ['GET', `/lessons/${l.id}/progress`], ['POST', `/lessons/${l.id}/start`], ['POST', `/lessons/${l.id}/complete`],
  ['GET', `/lessons/${l.id}/progress`],
  ['GET', '/xp'], ['GET', '/xp/history'], ['GET', '/coins'], ['GET', '/streak'], ['GET', '/levels/me'], ['GET', '/achievements/me'], ['GET', '/badges/me'],
  ['GET', '/progress'], ['GET', `/progress/courses/${c.id}`], ['GET', '/progress/history'], ['GET', '/mastery'],
  ['GET', '/recommendations'], ['GET', '/planner/today'], ['GET', '/study-sessions/stats'], ['GET', '/analytics/overview'],
  ['GET', '/notifications'], ['GET', '/notifications/unread'], ['GET', '/academic-levels'], ['GET', '/institutions'],
];
for (const [m, p] of routes) {
  const r = await call(m, p, learner);
  console.log(`${m} ${p.replace(c.id, ':courseId').replace(t.id, ':topicId').replace(l.id, ':lessonId')} → ${r.status}\n    ${shape(r.json).slice(0, 900)}`);
}
