import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { AdminJwtAuthGuard } from '../../admin/auth/guards/admin-jwt.guard.js';
import { QuizzesController } from '../../quizzes/quizzes.controller.js';
import { QuizzesService } from '../../quizzes/quizzes.service.js';
import { TestsController } from '../../tests/tests.controller.js';
import { TestsService } from '../../tests/tests.service.js';
import { ExamsController } from '../../exams/exams.controller.js';
import { ExamsService } from '../../exams/exams.service.js';
import { OfficialAttemptsService } from '../../official-attempts/official-attempts.js';

// Verifies that static GET routes are reachable and not captured by GET /:id
describe('static routes declared before :id', () => {
  let app: INestApplication;
  const quizzes = { getUserAttempts: vi.fn(() => ({ route: 'quiz-attempts' })), getForLearner: vi.fn(() => ({ route: 'quiz-by-id' })), findAll: vi.fn(() => ({ route: 'quiz-manage-all' })), findOne: vi.fn(() => ({ route: 'quiz-manage-one' })) };
  const tests = { getUserAttempts: vi.fn(() => ({ route: 'test-attempts' })), getForLearner: vi.fn(() => ({ route: 'test-by-id' })), findAll: vi.fn(() => ({ route: 'test-manage-all' })), findOne: vi.fn(() => ({ route: 'test-manage-one' })) };
  const exams = { getHistory: vi.fn(() => ({ route: 'exam-history' })), getForLearner: vi.fn(() => ({ route: 'exam-by-id' })), findAll: vi.fn(() => ({ route: 'exam-manage-all' })), findOne: vi.fn(() => ({ route: 'exam-manage-one' })) };

  // attempt history is served by the official-attempts service (stored attempts)
  const attempts = { history: vi.fn((_userId: string, kind: string) => ({ route: kind === 'exam' ? 'exam-history' : `${kind}-attempts` })) };
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [QuizzesController, TestsController, ExamsController],
      providers: [
        { provide: QuizzesService, useValue: quizzes },
        { provide: TestsService, useValue: tests },
        { provide: ExamsService, useValue: exams },
        { provide: OfficialAttemptsService, useValue: attempts },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminJwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => app.close());

  it.each([
    ['/api/v1/quizzes/attempts', 'quiz-attempts'],
    ['/api/v1/tests/attempts', 'test-attempts'],
    ['/api/v1/exams/history', 'exam-history'],
    ['/api/v1/quizzes/manage/all', 'quiz-manage-all'],
    ['/api/v1/tests/manage/all', 'test-manage-all'],
    ['/api/v1/exams/manage/all', 'exam-manage-all'],
    ['/api/v1/quizzes/manage/7c9e6679-7425-40de-944b-e07fc1f90ae7', 'quiz-manage-one'],
  ])('GET %s reaches its own handler', async (path, route) => {
    const res = await request(app.getHttpServer()).get(path);
    expect(res.status).toBe(200);
    expect(res.body.route).toBe(route);
  });

  it.each([
    ['/api/v1/quizzes/7c9e6679-7425-40de-944b-e07fc1f90ae7', 'quiz-by-id'],
    ['/api/v1/tests/7c9e6679-7425-40de-944b-e07fc1f90ae7', 'test-by-id'],
    ['/api/v1/exams/7c9e6679-7425-40de-944b-e07fc1f90ae7', 'exam-by-id'],
  ])('GET %s still reaches the by-id handler', async (path, route) => {
    const res = await request(app.getHttpServer()).get(path);
    expect(res.body.route).toBe(route);
  });

  it('never passes the static segment to findOne', () => {
    expect(quizzes.getForLearner).not.toHaveBeenCalledWith('attempts');
    expect(tests.getForLearner).not.toHaveBeenCalledWith('attempts');
    expect(exams.getForLearner).not.toHaveBeenCalledWith('history');
    expect(quizzes.getForLearner).not.toHaveBeenCalledWith('manage');
  });
});
