import { QuizzesService } from './quizzes.service.js';

describe('QuizzesService.submitAttempt reward policy', () => {
  const quiz = {
    id: 'quiz-1',
    title: 'Math',
    questions: [
      { id: 'q1', options: ['3', '4'], correctAnswer: 'B' },
      { id: 'q2', options: ['1', '2'], correctAnswer: 'A' },
    ],
  };

  function build(alreadyRewarded = false, storedQuiz: any = quiz) {
    const quizRepository = { findOne: vi.fn().mockResolvedValue(storedQuiz) };
    const configService = { get: vi.fn((_key: string, fallback?: string) => fallback ?? 'test-value') };
    const xpService = {
      awardXp: vi.fn().mockResolvedValue({}),
      hasAwardForReference: vi.fn().mockResolvedValue(alreadyRewarded),
    };
    const coinsService = { awardCoins: vi.fn().mockResolvedValue({}) };
    const service = new QuizzesService(quizRepository as any, configService as any, xpService as any, coinsService as any);
    return { service, xpService, coinsService };
  }

  it('awards XP and coins once for a graded passing attempt', async () => {
    const { service, xpService, coinsService } = build(false);
    const res = await service.submitAttempt('user-1', 'quiz-1', { answers: { q1: '4', q2: '1' } });
    expect(res.score).toBe(100);
    expect(res.xpAwarded).toBe(50);
    expect(res.coinsAwarded).toBe(20);
    expect(xpService.awardXp).toHaveBeenCalledWith('user-1', 50, 'QUIZ_COMPLETED', expect.stringContaining('[quiz:quiz-1]'));
    expect(coinsService.awardCoins).toHaveBeenCalledTimes(1);
  });

  it('does not award again when this quiz was already rewarded for the user', async () => {
    const { service, xpService, coinsService } = build(true);
    const res = await service.submitAttempt('user-1', 'quiz-1', { answers: { q1: '4', q2: '1' } });
    expect(res.xpAwarded).toBe(0);
    expect(res.coinsAwarded).toBe(0);
    expect(xpService.awardXp).not.toHaveBeenCalled();
    expect(coinsService.awardCoins).not.toHaveBeenCalled();
  });

  it('does not award for a failing attempt', async () => {
    const { service, xpService } = build(false);
    const res = await service.submitAttempt('user-1', 'quiz-1', { answers: { q1: '3', q2: '2' } });
    expect(res.score).toBe(0);
    expect(res.passed).toBe(false);
    expect(xpService.awardXp).not.toHaveBeenCalled();
  });

  it('does not award when the quiz has no answer key', async () => {
    const { service, xpService } = build(false, { id: 'quiz-2', questions: [{ question: 'Open' }] });
    const res = await service.submitAttempt('user-1', 'quiz-2', { answers: {} });
    expect(res.graded).toBe(false);
    expect(xpService.awardXp).not.toHaveBeenCalled();
  });
});
