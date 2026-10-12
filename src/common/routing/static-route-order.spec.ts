import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { QuizzesController } from '../../quizzes/quizzes.controller.js';
import { QuizzesService } from '../../quizzes/quizzes.service.js';
import { TestsController } from '../../tests/tests.controller.js';
import { TestsService } from '../../tests/tests.service.js';
import { ExamsController } from '../../exams/exams.controller.js';
import { ExamsService } from '../../exams/exams.service.js';

// Verifies that static GET routes are reachable and not captured by GET /:id
describe('static routes declared before :id', () => {
  let app: INestApplication;
  const quizzes = { getUserAttempts: vi.fn(() => ({ route: 'quiz-attempts' })), findOne: vi.fn(() => ({ route: 'quiz-by-id' })) };
  const tests = { getUserAttempts: vi.fn(() => ({ route: 'test-attempts' })), findOne: vi.fn(() => ({ route: 'test-by-id' })) };
  const exams = { getHistory: vi.fn(() => ({ route: 'exam-history' })), findOne: vi.fn(() => ({ route: 'exam-by-id' })) };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [QuizzesController, TestsController, ExamsController],
      providers: [
        { provide: QuizzesService, useValue: quizzes },
        { provide: TestsService, useValue: tests },
        { provide: ExamsService, useValue: exams },
      ],
    })
      .overrideGuard(JwtAuthGuard)
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
  ])('GET %s reaches its own handler', async (path, route) => {
    const res = await request(app.getHttpServer()).get(path);
    expect(res.status).toBe(200);
    expect(res.body.route).toBe(route);
  });

  it.each([
    ['/api/v1/quizzes/7c9e6679-7425-40de-944b-e07fc1f90ae7', 'quiz-by-id'],
    ['/api/v1/tests/7c9e6679-7425-40de-944b-e07fc1f90ae7', 'test-by-id'],
    ['/api/v1/exams/7c9e6679-7425-40de-944b-e07fc1f90ae7', 'exam-by-id'],
  ])('GET %s still reaches findOne', async (path, route) => {
    const res = await request(app.getHttpServer()).get(path);
    expect(res.body.route).toBe(route);
  });

  it('never passes the static segment to findOne', () => {
    expect(quizzes.findOne).not.toHaveBeenCalledWith('attempts');
    expect(tests.findOne).not.toHaveBeenCalledWith('attempts');
    expect(exams.findOne).not.toHaveBeenCalledWith('history');
  });
});
