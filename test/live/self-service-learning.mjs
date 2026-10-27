// LIVE: the self-service learning loop through the real backend + real AI service + MOCK model (test double).
// Upload/paste → extraction → generate lesson / quiz / exam / flashcards / course plan → attempts → review →
// YouTube session (transcript pasted; YouTube is not called) → grounded Q&A → search. Two learners for ownership.
// Usage (from the backend repo): node test/live/self-service-learning.mjs <text.pdf>   — prints no secrets
import fs from 'fs';
import { randomUUID } from 'crypto';

const API = process.env.API_URL ?? 'http://127.0.0.1:5055/api/v1';
if (/onrender\.com/.test(API)) throw new Error('Refusing to run against a deployed environment');
const [pdfPath] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
async function call(method, path, token, body, form) {
  for (let i = 0; i < 6; i++) {
    const r = await fetch(`${API}${path}`, { method, headers: { ...(form ? {} : { 'content-type': 'application/json' }), ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: form ?? (body ? JSON.stringify(body) : undefined) });
    if (r.status === 429) { await sleep((Number(r.headers.get('retry-after')) || 2) * 1000 + 200); continue; }
    return { status: r.status, json: await r.json().catch(() => null) };
  }
  throw new Error(`${path} stayed throttled`);
}
const R = Date.now().toString(36);
async function signup(p) {
  const pw = `Pw-${R}-local`;
  const r = await call('POST', '/auth/signup', null, { fullName: 'Self Learner', username: `${p}${R}`, email: `${p}-${R}@example.test`, password: pw, confirmPassword: pw });
  return r.json.accessToken;
}

const a = await signup('ssl');
const b = await signup('sslo');

// --- course and materials ---
const course = (await call('POST', '/personal-courses', a, { title: `Biology ${R}`, subjects: ['Biology'], examGoals: ['WAEC'], objectives: ['Explain photosynthesis'] })).json;
check('a learner creates a private course with objectives', course?.id && course.objectives?.[0] === 'Explain photosynthesis');

const form = new FormData();
form.append('file', new Blob([fs.readFileSync(pdfPath)], { type: 'application/pdf' }), 'photosynthesis.pdf');
form.append('personalCourseId', course.id);
const up = await call('POST', '/materials', a, null, form);
check('PDF upload starts as PROCESSING', up.json?.status === 'PROCESSING', up.json?.status);
let mat = up.json;
for (let i = 0; i < 30 && mat?.status === 'PROCESSING'; i++) { await sleep(500); mat = (await call('GET', `/materials/${up.json.id}`, a)).json; }
check('text is extracted from the PDF by the AI service (READY, characters counted)', mat?.status === 'READY' && mat.textChars > 200, `${mat?.status}, ${mat?.textChars} chars`);
const text = (await call('GET', `/materials/${mat.id}/text`, a)).json;
check('the extracted text is the PDF’s text', /Chlorophyll in the leaves absorbs light/.test(text?.text ?? ''));

const blank = new FormData();
blank.append('file', new Blob([Buffer.from('%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n')], { type: 'application/pdf' }), 'scan.pdf');
const bad = (await call('POST', '/materials', a, null, blank)).json;
let badNow = bad;
for (let i = 0; i < 30 && badNow?.status === 'PROCESSING'; i++) { await sleep(500); badNow = (await call('GET', `/materials/${bad.id}`, a)).json; }
check('a PDF without text is FAILED with an honest reason (not an empty success)', badNow?.status === 'FAILED' && /text|PDF/i.test(badNow.processingError ?? ''), badNow?.processingError?.slice(0, 80));

const pasted = (await call('POST', '/materials/text', a, { title: 'Respiration notes', text: 'Respiration releases energy from glucose in the mitochondria of cells.' })).json;
check('pasted text becomes a READY material at once', pasted?.status === 'READY' && pasted.sourceType === 'text');

// --- generation ---
const gen = (kind, extra = {}) => call('POST', '/learning/generate', a, { requestId: randomUUID(), kind, sourceType: 'material', sourceId: mat.id, personalCourseId: course.id, ...extra });
const lessonReq = randomUUID();
const lesson = (await call('POST', '/learning/generate', a, { requestId: lessonReq, kind: 'lesson', sourceType: 'material', sourceId: mat.id, personalCourseId: course.id, options: { level: 'SS 2', examGoal: 'WAEC' } })).json;
const lessonAgain = (await call('POST', '/learning/generate', a, { requestId: lessonReq, kind: 'lesson', sourceType: 'material', sourceId: mat.id, personalCourseId: course.id })).json;
check('a lesson is generated and saved; the same request again returns it without regenerating', lesson?.type === 'resource' && lessonAgain?.id === lesson.id && lessonAgain.reused === true);
const saved = (await call('GET', `/learning/resources/${lesson.id}`, a)).json;
check('the lesson is persisted with links to its material and course', saved?.materialId === mat.id && saved.personalCourseId === course.id && saved.content.length > 0);

const quiz = (await gen('quiz', { options: { count: 4, difficulty: 'easy', feedbackMode: 'immediate' } })).json;
const exam = (await gen('exam', { options: { count: 6, examGoal: 'WAEC', durationMinutes: 20 } })).json;
const deck = (await gen('flashcards', { options: { count: 5 } })).json;
const plan = (await call('POST', '/learning/generate', a, { requestId: randomUUID(), kind: 'course_plan', sourceType: 'course', sourceId: course.id, options: { count: 3 } })).json;
check('quiz, mock exam, flashcards and course plan are generated', quiz?.type === 'assessment' && exam?.type === 'assessment' && deck?.type === 'deck' && plan?.type === 'course', [quiz?.type, exam?.type, deck?.type, plan?.type].join('/'));
const deckRow = (await call('GET', `/flashcard-decks/${deck.id}`, a)).json;
check('flashcards land in a real deck', deckRow?.cards?.length === 5, `${deckRow?.cards?.length} cards`);
const courseNow = (await call('GET', `/personal-courses/${course.id}`, a)).json;
check('the course plan adds modules to the course', courseNow?.modules?.length === 3 && courseNow.materials.length === 1);

// --- assessments and attempts ---
const examView = (await call('GET', `/learner-assessments/${exam.id}`, a)).json;
check('the exam shows no answer key, is timed, and is labelled AI-generated practice', !JSON.stringify(examView).match(/explanation|"answer"/) && examView.durationMinutes === 20 && /not official/.test(examView.notice) && examView.questionCount === 6);
const att = (await call('POST', `/learner-assessments/${exam.id}/attempts`, a)).json;
const att2 = (await call('POST', `/learner-assessments/${exam.id}/attempts`, a)).json;
check('starting twice resumes the same attempt (no duplicate)', att?.attempt?.id && att2?.attempt?.id === att.attempt.id && !!att.attempt.deadlineAt);
await call('PATCH', `/learner-assessments/attempts/${att.attempt.id}`, a, { answers: { 0: 'Answer 1', 1: 'Wrong 2a' } });
const reloaded = (await call('GET', `/learner-assessments/attempts/${att.attempt.id}`, a)).json;
check('saved answers survive a reload', reloaded?.answers?.['0'] === 'Answer 1' && reloaded.attempt.status === 'in_progress');
const answers = Object.fromEntries(examView.questions.map((q, i) => [i, i < 3 ? `Answer ${i + 1}` : `Wrong ${i + 1}a`]));
const sub = (await call('POST', `/learner-assessments/attempts/${att.attempt.id}/submit`, a, { answers })).json;
check('submitting grades on the server: 3 of 6 = 50%, with explanations and topics', sub?.attempt?.score === 50 && sub.review.questions[0].explanation && sub.review.topics.length > 0, `score ${sub?.attempt?.score}`);
const sub2 = (await call('POST', `/learner-assessments/attempts/${att.attempt.id}/submit`, a, { answers: Object.fromEntries(examView.questions.map((_, i) => [i, `Answer ${i + 1}`])) })).json;
check('submitting again does not change the result', sub2?.attempt?.score === 50);
const history = (await call('GET', `/learner-assessments/attempts?assessmentId=${exam.id}`, a)).json;
check('attempt history lists the attempt', history?.length === 1 && history[0].score === 50);
const qa = (await call('POST', `/learner-assessments/${quiz.id}/attempts`, a)).json;
const checked = (await call('PATCH', `/learner-assessments/attempts/${qa.attempt.id}`, a, { answers: { 0: 'Wrong 1a' } })).json;
check('practice quiz checks each answer as it is given', checked?.checked?.[0]?.correct === false && checked.checked[0].answer === 'Answer 1');
const list = (await call('GET', '/learner-assessments?kind=exam', a)).json;
check('Exams list shows the mock exam with its best score', list?.[0]?.id === exam.id && list[0].bestScore === 50);

// --- YouTube session ---
const yt = (await call('POST', '/youtube-sessions', a, { url: 'https://youtu.be/dQw4w9WgXcQ', title: 'Photosynthesis explained', goal: 'Understand the light reactions', personalCourseId: course.id })).json;
check('a YouTube session is created from a youtu.be link (canonical URL)', yt?.videoId === 'dQw4w9WgXcQ' && yt.url === 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
check('with no transcript available it says so honestly', yt?.transcriptStatus === 'unavailable' && /transcript/i.test(yt.transcriptError ?? ''));
const noTx = await call('POST', `/youtube-sessions/${yt.id}/ask`, a, { question: 'What absorbs light?' });
check('asking without a transcript is refused, not answered from nothing', noTx.status === 409);
await call('PUT', `/youtube-sessions/${yt.id}/transcript`, a, { text: '[00:05] Plants need light.\n[01:05] Chlorophyll absorbs light in the leaves.\n[02:10] Glucose is made in the Calvin cycle.' });
const ask = (await call('POST', `/youtube-sessions/${yt.id}/ask`, a, { question: 'What absorbs light?' })).json;
check('a grounded answer cites only timestamps that exist in the transcript', JSON.stringify(ask?.answer?.citations) === '[5]' && !ask.answer.content.includes('99:59'), `${JSON.stringify(ask?.answer?.citations)} ${ask?.answer?.content}`);
const msgs = (await call('GET', `/youtube-sessions/${yt.id}/messages`, a)).json;
check('the Q&A is saved in the session', msgs?.length === 2 && msgs[0].role === 'user');
const ytQuiz = (await call('POST', '/learning/generate', a, { requestId: randomUUID(), kind: 'quiz', sourceType: 'youtube', sourceId: yt.id, options: { count: 3 } })).json;
check('a quiz can be generated from the video transcript', ytQuiz?.type === 'assessment');

// --- search ---
await sleep(500);
const s = (await call('GET', `/search/everything?q=${encodeURIComponent('photosynthesis')}`, a)).json;
const types = new Set((s?.results ?? []).map((r) => r.type));
check('search finds the learner’s material, lesson and YouTube session', types.has('material') && types.has('resource') && types.has('youtube'), [...types].join(','));
const sb = (await call('GET', `/search/everything?q=${encodeURIComponent('photosynthesis')}`, b)).json;
check('another learner’s search returns none of it', !(sb?.results ?? []).some((r) => ['material', 'resource', 'youtube', 'assessment', 'personal_course'].includes(r.type)));

// --- ownership ---
const cross = await Promise.all([
  call('GET', `/materials/${mat.id}/text`, b),
  call('GET', `/learning/resources/${lesson.id}`, b),
  call('GET', `/learner-assessments/${exam.id}`, b),
  call('POST', `/learner-assessments/${exam.id}/attempts`, b),
  call('GET', `/learner-assessments/attempts/${att.attempt.id}`, b),
  call('GET', `/youtube-sessions/${yt.id}`, b),
  call('POST', '/learning/generate', b, { requestId: randomUUID(), kind: 'lesson', sourceType: 'material', sourceId: mat.id }),
]);
check('another learner gets 404 for every private resource and cannot generate from it', cross.every((r) => r.status === 404), cross.map((r) => r.status).join(','));

console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exitCode = failed ? 1 : 0;
