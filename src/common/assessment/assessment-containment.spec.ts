import { NotImplementedException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants.js';
import { toLearnerAssessment, toLearnerQuestion } from './learner-questions.js';
import { ADMIN_PERMISSION_KEY, AdminPermission } from '../../admin/auth/admin-permissions.js';
import { AdminJwtAuthGuard } from '../../admin/auth/guards/admin-jwt.guard.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { QuizzesController } from '../../quizzes/quizzes.controller.js';
import { TestsController } from '../../tests/tests.controller.js';
import { ExamsController } from '../../exams/exams.controller.js';
import { QuizzesService } from '../../quizzes/quizzes.service.js';
import { TestsService } from '../../tests/tests.service.js';
import { ExamsService } from '../../exams/exams.service.js';

const QUESTIONS = [
  { question: '2 + 2?', options: ['3', '4'], correctAnswer: '4', explanation: 'Two pairs.' },
  { question: 'Capital of Nigeria?', options: ['Lagos', 'Abuja'], answer: 'Abuja', solution: 'Since 1991.' },
];
const stored = { id: 'a1', title: 'Check', questions: QUESTIONS };

describe('answer keys never reach learners', () => {
  it('strips every answer field and its explanation, keeps the rest', () => {
    expect(toLearnerQuestion(QUESTIONS[0])).toEqual({ question: '2 + 2?', options: ['3', '4'] });
    expect(toLearnerQuestion(QUESTIONS[1])).toEqual({ question: 'Capital of Nigeria?', options: ['Lagos', 'Abuja'] });
    expect(toLearnerAssessment(stored)).toEqual({ id: 'a1', title: 'Check', questions: [{ question: '2 + 2?', options: ['3', '4'] }, { question: 'Capital of Nigeria?', options: ['Lagos', 'Abuja'] }] });
    expect(stored.questions[0].correctAnswer).toBe('4'); // the stored copy (used for grading) is untouched
  });

  it.each([
    ['quizzes', (repo: any) => new QuizzesService(repo, {} as never, {} as never, {} as never)],
    ['tests', (repo: any) => new TestsService(repo, {} as never)],
    ['exams', (repo: any) => new ExamsService(repo, {} as never)],
  ])('%s: the learner list and detail are sanitised', async (_name, make) => {
    const repo = { find: vi.fn(async () => [stored]), findOne: vi.fn(async () => stored) };
    const service: any = make(repo);
    const json = JSON.stringify([await service.listForLearners(), await service.getForLearner('a1')]);
    expect(json).not.toMatch(/correctAnswer|"answer"|explanation|solution|Two pairs|Since 1991/);
  });
});

describe('only administrators can create, edit or delete assessments', () => {
  const guardsOf = (ctrl: any, method: string) => (Reflect.getMetadata(GUARDS_METADATA, ctrl.prototype[method]) ?? []) as unknown[];
  const permissionOf = (ctrl: any, method: string) => Reflect.getMetadata(ADMIN_PERMISSION_KEY, ctrl.prototype[method]);

  it.each([
    [QuizzesController, ['create', 'update', 'remove', 'manageList', 'manageOne'], ['findAll', 'findOne', 'submitAttempt', 'generate']],
    [TestsController, ['create', 'update', 'remove', 'manageList', 'manageOne'], ['findAll', 'findOne', 'submitAttempt', 'generate']],
    [ExamsController, ['create', 'update', 'remove', 'manageList', 'manageOne'], ['findAll', 'findOne', 'submitAttempt', 'generate']],
  ])('%p', (ctrl, adminRoutes, learnerRoutes) => {
    expect(Reflect.getMetadata(GUARDS_METADATA, ctrl)).toBeUndefined(); // no class-level learner guard (it would reject admin tokens)
    for (const m of adminRoutes) {
      expect(guardsOf(ctrl, m)).toEqual([AdminJwtAuthGuard]);
      expect(permissionOf(ctrl, m)).toBe(AdminPermission.CONTENT_MANAGE);
    }
    for (const m of learnerRoutes) expect(guardsOf(ctrl, m)).toEqual([JwtAuthGuard]);
  });
});

describe('tests and exams are graded for real (no fixed scores)', () => {
  it.each([
    ['tests', (repo: any) => new TestsService(repo, {} as never), 'testId'],
    ['exams', (repo: any) => new ExamsService(repo, {} as never), 'examId'],
  ])('%s', async (_name, make, idKey) => {
    const service: any = make({ findOne: vi.fn(async () => stored) });
    const perfect = await service.submitAttempt('a1', { answers: ['4', 'Abuja'] });
    const half = await service.submitAttempt('a1', { answers: ['4', 'Lagos'] });
    const none = await service.submitAttempt('a1', { answers: [] });
    expect(perfect).toMatchObject({ [idKey]: 'a1', score: 100, correctAnswers: 2, totalQuestions: 2, graded: true });
    expect(half.score).toBe(50);
    expect(none.score).toBe(0);
    expect([perfect.score, half.score, none.score]).not.toContain(88.5);
    expect(JSON.stringify(perfect)).not.toMatch(/"grade":"A"|92/);
  });
});

describe('attempt endpoints answer 501 FEATURE_UNAVAILABLE (attempts are not stored)', () => {
  const svc = {
    quiz: new QuizzesService({} as never, {} as never, {} as never, {} as never) as any,
    test: new TestsService({} as never, {} as never) as any,
    exam: new ExamsService({} as never, {} as never) as any,
  };
  it.each([
    [svc.quiz, 'startAttempt'], [svc.quiz, 'getResults'], [svc.quiz, 'getUserAttempts'], [svc.quiz, 'getSpecificAttempt'],
    [svc.test, 'startAttempt'], [svc.test, 'getResults'], [svc.test, 'getUserAttempts'], [svc.test, 'getSpecificAttempt'],
    [svc.exam, 'startAttempt'], [svc.exam, 'getResult'], [svc.exam, 'getHistory'], [svc.exam, 'getSpecificAttempt'], [svc.exam, 'simulateExam'], [svc.exam, 'getReadiness'],
  ])('%#: %s', async (service, method) => {
    const err = await service[method]('x').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(NotImplementedException);
    expect((err as NotImplementedException).getResponse()).toMatchObject({ statusCode: 501, code: 'FEATURE_UNAVAILABLE' });
  });
});
