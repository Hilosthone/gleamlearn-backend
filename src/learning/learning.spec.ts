import { ConflictException, NotFoundException } from '@nestjs/common';
import * as aiHttp from '../common/ai-service/ai-http.client.js';
import { grade, learnerView, sanitiseAnswers, transcriptStamps, verifyCitations, formatTimestamp } from './grading.js';
import { canonicalUrl, segmentsOf, toTranscriptLines, videoIdFrom } from './youtube-sessions.service.js';
import { LearningService } from './learning.service.js';
import { LearnerAssessmentsService } from './assessments.service.js';
import { SearchEverythingService } from './search-everything.service.js';
import { LearnerMaterial, PersonalCourse, PersonalCourseModule } from '../learner-content/entities.js';
import { Deck } from '../flashcards/entities/deck.entity.js';
import { Flashcard } from '../flashcards/entities/flashcard.entity.js';
import { LearningResource } from './entities.js';

const Q = [
  { question: 'What makes ATP?', options: ['Mitochondria', 'Nucleus', 'Wall', 'Vacuole'], answer: 'Mitochondria', explanation: 'Respiration.', topic: 'Cells' },
  { question: 'Plant wall?', options: ['Cellulose', 'Chitin'], answer: 'Cellulose', explanation: 'Plants.', topic: 'Cells' },
  { question: 'Gene unit?', options: ['DNA', 'Fat'], answer: 'DNA', explanation: 'Genetics.', topic: 'Genetics' },
];

/** In-memory repository with the calls these services make (findOne/find/count/save/update/delete/create). */
function repo<T extends Record<string, any>>(rows: T[] = []) {
  const ok = (r: T, where: Record<string, any> = {}) =>
    Object.entries(where).every(([k, v]) => (v && typeof v === 'object' && '_value' in v ? (v._value as unknown[]).includes(r[k]) : v && typeof v === 'object' && v._type === 'isNull' ? r[k] == null : r[k] === v));
  let n = 0;
  const r = {
    rows,
    uniqueOpen: false, // emulate the partial unique index on in-progress attempts
    create: (d: Partial<T>) => ({ ...d }) as T,
    save: vi.fn(async (d: any) => {
      const list = Array.isArray(d) ? d : [d];
      for (const item of list) {
        if (r.uniqueOpen && item.status === 'in_progress' && rows.some((x) => x.status === 'in_progress' && x.userId === item.userId && x.assessmentId === item.assessmentId && x.id !== item.id)) {
          throw Object.assign(new Error('duplicate'), { driverError: { code: '23505' } });
        }
        if (!item.id) Object.assign(item, { id: `id-${++n}`, createdAt: new Date(), updatedAt: new Date() });
        const i = rows.findIndex((x) => x.id === item.id);
        if (i >= 0) rows[i] = { ...rows[i], ...item };
        else rows.push(item);
      }
      return d;
    }),
    findOne: vi.fn(async ({ where }: any) => rows.find((x) => ok(x, where)) ?? null),
    find: vi.fn(async ({ where }: any = {}) => rows.filter((x) => ok(x, where))),
    count: vi.fn(async ({ where }: any = {}) => rows.filter((x) => ok(x, where)).length),
    update: vi.fn(async (where: any, patch: any) => {
      const hit = rows.filter((x) => ok(x, where));
      hit.forEach((x) => Object.assign(x, patch));
      return { affected: hit.length };
    }),
    delete: vi.fn(async (where: any) => {
      const before = rows.length;
      for (let i = rows.length - 1; i >= 0; i--) if (ok(rows[i], where)) rows.splice(i, 1);
      return { affected: before - rows.length };
    }),
  };
  return r;
}

describe('grading and the learner view', () => {
  it('scores on the server, reviews every question and groups strengths / topics to revise', () => {
    const r = grade(Q, { 0: 'Mitochondria', 1: 'Cellulose', 2: 'Fat' });
    expect(r).toMatchObject({ score: 67, correctCount: 2 });
    expect(r.review.strengths).toEqual(['Cells']);
    expect(r.review.toRevise).toEqual(['Genetics']);
    expect(r.review.questions[2]).toMatchObject({ chosen: 'Fat', answer: 'DNA', correct: false, explanation: 'Genetics.' });
  });

  it('keeps only answers that are one of the question’s options', () => {
    expect(sanitiseAnswers(Q, { 0: 'Mitochondria', 1: 'Steel', 9: 'DNA', x: 'a', 2: 5 })).toEqual({ 0: 'Mitochondria' });
  });

  it('never sends answers or explanations before a review, and labels the questions as AI-generated', () => {
    const v = learnerView({ id: 'a', kind: 'exam', title: 'T', questions: Q } as never);
    expect(JSON.stringify(v)).not.toMatch(/explanation|"answer"|Respiration/);
    expect(v.notice).toMatch(/not official past questions/);
  });
});

describe('YouTube helpers', () => {
  it('accepts the usual URL shapes and rejects others', () => {
    for (const u of ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10', 'https://youtu.be/dQw4w9WgXcQ', 'https://m.youtube.com/shorts/dQw4w9WgXcQ', 'https://www.youtube.com/embed/dQw4w9WgXcQ']) {
      expect(videoIdFrom(u)).toBe('dQw4w9WgXcQ');
    }
    for (const u of ['https://vimeo.com/123', 'not a url', 'https://www.youtube.com/watch?v=short', 'https://evil.com/watch?v=dQw4w9WgXcQ']) expect(videoIdFrom(u)).toBeNull();
    expect(canonicalUrl('dQw4w9WgXcQ')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  it('transcript offsets in ms or seconds become [mm:ss] lines and segments', () => {
    expect(toTranscriptLines([{ text: 'Hello', offset: 0 }, { text: 'World', offset: 65000 }])).toBe('[00:00] Hello\n[01:05] World');
    expect(toTranscriptLines([{ text: 'Hi', offset: 1.5 }, { text: 'There', offset: 3725.2 }])).toBe('[00:01] Hi\n[1:02:05] There');
    expect(segmentsOf('[00:00] Hello\n[01:05] World\nno stamp')).toEqual([{ start: 0, text: 'Hello' }, { start: 65, text: 'World' }]);
  });

  it('only timestamps that exist in the transcript survive in an answer', () => {
    const stamps = transcriptStamps('[00:10] Chlorophyll\n[01:05] Light');
    const r = verifyCitations('See [01:05] and also [99:59].', stamps);
    expect(r.citations).toEqual([65]);
    expect(r.text).not.toContain('99:59');
    expect(r.text).toContain('[01:05]');
    expect(formatTimestamp(3725)).toBe('1:02:05');
  });
});

describe('LearningService.generate', () => {
  const make = () => {
    const repos = new Map<unknown, ReturnType<typeof repo>>([
      [LearnerMaterial, repo<any>([{ id: 'm1', userId: 'u1', originalName: 'Biology.pdf', status: 'READY', extractedText: 'Cells and genes. '.repeat(5), personalCourseId: null }, { id: 'm2', userId: 'u1', originalName: 'Busy.pdf', status: 'PROCESSING', extractedText: null }])],
      [PersonalCourse, repo<any>([{ id: 'c1', userId: 'u1', title: 'Bio', subjects: [], objectives: [] }])],
      [PersonalCourseModule, repo<any>()],
      [Deck, repo<any>()],
      [Flashcard, repo<any>()],
      [LearningResource, repo<any>()],
    ]);
    const ds: any = { getRepository: (e: unknown) => repos.get(e), transaction: async (fn: any) => fn({ getRepository: (e: unknown) => repos.get(e) }) };
    const resources = repos.get(LearningResource)!;
    const assessments = repo<any>();
    const post = vi.fn();
    vi.spyOn(aiHttp, 'getAiHttpClient').mockReturnValue({ post } as never);
    return { service: new LearningService(ds, resources as never, assessments as never), post, repos, resources, assessments };
  };
  afterEach(() => vi.restoreAllMocks());

  it('a lesson from the learner’s material is generated once and persisted with its source link', async () => {
    const { service, post, resources } = make();
    post.mockResolvedValue({ data: { content: '## Cells', truncated: false } });
    const r = await service.generate('u1', { requestId: '11111111-1111-1111-1111-111111111111', kind: 'lesson', sourceType: 'material', sourceId: 'm1' });
    expect(r).toMatchObject({ type: 'resource', reused: false });
    expect(resources.rows[0]).toMatchObject({ userId: 'u1', kind: 'lesson', materialId: 'm1', content: '## Cells' });
    expect(post.mock.calls[0][1]).toMatchObject({ kind: 'lesson', text: expect.stringContaining('Cells and genes') });
    // the same request again (retry / double click): same result, no second AI call
    const again = await service.generate('u1', { requestId: '11111111-1111-1111-1111-111111111111', kind: 'lesson', sourceType: 'material', sourceId: 'm1' });
    expect(again).toMatchObject({ id: r.id, reused: true });
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('two identical requests at the same moment make one AI call', async () => {
    const { service, post } = make();
    post.mockImplementation(() => new Promise((res) => setTimeout(() => res({ data: { content: 'x' } }), 20)));
    const input = { requestId: '22222222-2222-2222-2222-222222222222', kind: 'summary' as const, sourceType: 'text' as const, text: 'Photosynthesis makes food in plants.' };
    const [a, b] = await Promise.all([service.generate('u1', input), service.generate('u1', input)]);
    expect(a.id).toBe(b.id);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('quizzes and mock exams are persisted with their answer key and settings', async () => {
    const { service, post, assessments } = make();
    post.mockResolvedValue({ data: { questions: Q, requested: 5, returned: 3 } });
    const r = await service.generate('u1', { requestId: '33333333-3333-3333-3333-333333333333', kind: 'exam', sourceType: 'material', sourceId: 'm1', options: { examGoal: 'JAMB', durationMinutes: 30, difficulty: 'hard' } });
    expect(r.type).toBe('assessment');
    expect(assessments.rows[0]).toMatchObject({ kind: 'exam', examType: 'JAMB', durationMinutes: 30, requestedCount: 5, feedbackMode: 'after_submit', materialId: 'm1' });
    expect(assessments.rows[0].questions).toHaveLength(3);
  });

  it('flashcards become a real deck with cards (existing tables), course plans become modules', async () => {
    const { service, post, repos } = make();
    post.mockResolvedValueOnce({ data: { cards: [{ question: 'q1', answer: 'a1' }, { question: 'q2', answer: 'a2' }] } });
    const d = await service.generate('u1', { requestId: '44444444-4444-4444-4444-444444444444', kind: 'flashcards', sourceType: 'material', sourceId: 'm1' });
    expect(d.type).toBe('deck');
    expect(repos.get(Deck)!.rows[0]).toMatchObject({ userId: 'u1' });
    expect(repos.get(Flashcard)!.rows.map((c: any) => c.question)).toEqual(['q1', 'q2']);
    post.mockResolvedValueOnce({ data: { modules: [{ title: 'Cells', objective: 'o' }, { title: 'Genes', objective: '' }] } });
    const plan = await service.generate('u1', { requestId: '55555555-5555-5555-5555-555555555555', kind: 'course_plan', sourceType: 'course', sourceId: 'c1' });
    expect(plan).toMatchObject({ type: 'course', id: 'c1' });
    expect(repos.get(PersonalCourseModule)!.rows.map((m: any) => [m.title, m.position])).toEqual([['Cells', 0], ['Genes', 1]]);
  });

  it('another learner’s material is not found; unprocessed material is refused; AI failures store nothing', async () => {
    const { service, post, resources } = make();
    await expect(service.generate('u2', { requestId: '66666666-6666-6666-6666-666666666666', kind: 'lesson', sourceType: 'material', sourceId: 'm1' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.generate('u1', { requestId: '77777777-7777-7777-7777-777777777777', kind: 'lesson', sourceType: 'material', sourceId: 'm2' })).rejects.toBeInstanceOf(ConflictException);
    post.mockRejectedValue({ response: { status: 502, data: { detail: { code: 'AI_BAD_OUTPUT', message: 'The AI did not return usable questions. Please try again.' } } } });
    await expect(service.generate('u1', { requestId: '88888888-8888-8888-8888-888888888888', kind: 'quiz', sourceType: 'material', sourceId: 'm1' })).rejects.toMatchObject({ status: 502 });
    expect(post).toHaveBeenCalledTimes(1);
    expect(resources.rows).toHaveLength(0);
  });
});

describe('LearnerAssessmentsService attempts', () => {
  const make = (extra: Record<string, unknown> = {}) => {
    const assessments = repo<any>([{ id: 'a1', userId: 'u1', kind: 'quiz', title: 'Bio', questions: Q, feedbackMode: 'after_submit', durationMinutes: null, ...extra }]);
    const attempts = repo<any>();
    attempts.uniqueOpen = true;
    return { service: new LearnerAssessmentsService(assessments as never, attempts as never), attempts };
  };

  it('start resumes the open attempt; answers are saved and survive a reload; submit grades once', async () => {
    const { service, attempts } = make();
    const first = await service.start('u1', 'a1');
    const again = await service.start('u1', 'a1');
    expect(again.attempt.id).toBe(first.attempt.id);
    expect(attempts.rows).toHaveLength(1);
    await service.save('u1', first.attempt.id, { 0: 'Mitochondria', 1: 'Steel' });
    expect((await service.attempt('u1', first.attempt.id)).answers).toEqual({ 0: 'Mitochondria' });
    const done: any = await service.submit('u1', first.attempt.id, { 1: 'Cellulose', 2: 'DNA' });
    expect(done.attempt).toMatchObject({ status: 'submitted', score: 100, correctCount: 3 });
    expect(done.review.questions[0].explanation).toBe('Respiration.');
    const twice: any = await service.submit('u1', first.attempt.id, { 0: 'Nucleus' });
    expect(twice.attempt.score).toBe(100); // the first result stands
    await expect(service.save('u1', first.attempt.id, { 0: 'Nucleus' })).rejects.toBeInstanceOf(ConflictException);
    // a new attempt after submitting is allowed
    expect((await service.start('u1', 'a1')).attempt.id).not.toBe(first.attempt.id);
  });

  it('a timed attempt past its deadline is submitted with the answers saved in time', async () => {
    const { service, attempts } = make({ durationMinutes: 10 });
    const t = await service.start('u1', 'a1');
    await service.save('u1', t.attempt.id, { 0: 'Mitochondria' });
    attempts.rows[0].deadlineAt = new Date(Date.now() - 60_000);
    const late: any = await service.submit('u1', t.attempt.id, { 1: 'Cellulose', 2: 'DNA' });
    expect(late.attempt).toMatchObject({ status: 'submitted', autoSubmitted: true, correctCount: 1 });
  });

  it('practice mode checks each answered question; exam mode reveals nothing before submitting', async () => {
    const practice = make({ feedbackMode: 'immediate' });
    const t = await practice.service.start('u1', 'a1');
    const saved: any = await practice.service.save('u1', t.attempt.id, { 0: 'Nucleus' });
    expect(saved.checked).toEqual([{ index: 0, correct: false, answer: 'Mitochondria', explanation: 'Respiration.' }]);
    const exam = make();
    const e = await exam.service.start('u1', 'a1');
    const out: any = await exam.service.save('u1', e.attempt.id, { 0: 'Nucleus' });
    expect(out.checked).toBeUndefined();
    expect(JSON.stringify(out)).not.toMatch(/Respiration/);
  });

  it('another learner can neither see, start, answer nor review it', async () => {
    const { service } = make();
    const t = await service.start('u1', 'a1');
    await expect(service.get('u2', 'a1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.start('u2', 'a1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.save('u2', t.attempt.id, {})).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.attempt('u2', t.attempt.id)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('search everything', () => {
  it('every learner-owned query is filtered by the signed-in learner; missing tables are reported, not faked', async () => {
    const calls: { sql: string; params: unknown[] }[] = [];
    const ds: any = {
      query: vi.fn(async (sql: string, params: unknown[]) => {
        calls.push({ sql, params });
        if (sql.includes('learner_assessments')) throw Object.assign(new Error('relation does not exist'), { driverError: { code: '42P01' } });
        return sql.includes('FROM personal_courses') ? [{ id: 'p1', title: 'My Bio', updatedAt: null }] : [];
      }),
    };
    const out = await new SearchEverythingService(ds).search('u1', ' bio ');
    expect(out.results).toEqual([{ type: 'personal_course', id: 'p1', title: 'My Bio', subtitle: 'My course', href: '/my-courses/p1', updatedAt: null }]);
    expect(out.unavailableTypes).toEqual(['assessment']);
    for (const c of calls.filter((c) => !c.sql.includes('FROM courses'))) {
      expect(c.sql).toContain('"userId" = $2');
      expect(c.params).toEqual(['%bio%', 'u1']);
    }
    expect((await new SearchEverythingService(ds).search('u1', 'a')).results).toEqual([]); // too short: no queries
  });
});
