import { AnalyticsService } from './analytics.service.js';

const make = (performances: any[], official: any[] = [], learner: any[] = [], missing = false) => {
  const repo = { find: vi.fn(async ({ where }: any) => performances.filter((p) => Object.entries(where).every(([k, v]) => p[k] === v))) };
  const ds = {
    query: vi.fn(async (sql: string) => {
      if (missing) throw Object.assign(new Error('missing'), { code: '42P01' });
      return sql.includes('official_assessment_attempts') ? official : learner;
    }),
  };
  return new AnalyticsService(repo as never, ds as never);
};

describe('learner analytics: real records only', () => {
  it('with no data every figure is empty or null (no fabricated mastery)', async () => {
    const s = make([]);
    expect(await s.getMastery('u1')).toMatchObject({ overallMasteryPercentage: null, questionsAnswered: 0 });
    expect(await s.getOverview('u1')).toMatchObject({ totalAssessments: 0, averageScore: null, masteryLevel: null });
    expect((await s.getWeakTopics('u1')).weakTopics).toEqual([]);
  });

  it('aggregates topics across official and own attempts; weak/strong use thresholds', async () => {
    const s = make(
      [],
      [{ topics: [{ topic: 'Cells', correct: 1, total: 4 }, { topic: 'Genes', correct: 3, total: 3 }] }],
      [{ topics: [{ topic: 'Cells', correct: 0, total: 2 }] }],
    );
    const topics = (await s.getTopicsAnalytics('u1')).topics;
    expect(topics.find((t) => t.topic === 'Cells')).toMatchObject({ correct: 1, total: 6, percent: 17, attempts: 2 });
    expect((await s.getWeakTopics('u1')).weakTopics.map((t) => t.topic)).toEqual(['Cells']);
    expect((await s.getStrongTopics('u1')).strongTopics.map((t) => t.topic)).toEqual(['Genes']);
    expect((await s.getMastery('u1')).overallMasteryPercentage).toBe(44.4); // 4 of 9
  });

  it('a missing attempts table is skipped, not an error', async () => {
    expect((await make([], [], [], true).getTopicsAnalytics('u1')).topics).toEqual([]);
  });

  it('courses are grouped from performance rows; only this learner’s rows are used', async () => {
    const at = new Date('2026-10-28T10:00:00Z');
    const s = make([
      { userId: 'u1', courseId: 'c1', score: 50, timeSpentSeconds: 60, assessmentType: 'quiz', createdAt: at },
      { userId: 'u1', courseId: 'c1', score: 100, timeSpentSeconds: 60, assessmentType: 'exam', createdAt: at },
      { userId: 'u2', courseId: 'c1', score: 0, timeSpentSeconds: 60, assessmentType: 'quiz', createdAt: at },
    ]);
    expect((await s.getCoursesAnalytics('u1')).courses).toEqual([expect.objectContaining({ courseId: 'c1', assessments: 2, averageScore: 75 })]);
    expect(await s.getPerformanceByType('u1', 'quiz')).toMatchObject({ totalCompleted: 1, averageScore: 50 });
  });
});
