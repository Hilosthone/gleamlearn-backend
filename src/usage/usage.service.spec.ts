import { UsageService } from './usage.service.js';
import { MAX_COURSES, MAX_MATERIALS } from '../learner-content/learner-content.js';

const missing = () => Object.assign(new Error('relation does not exist'), { code: '42P01' });

/** answers count(*) by table name; a table listed in `absent` doesn't exist */
function db(counts: Record<string, number>, absent: string[] = []) {
  return {
    query: vi.fn(async (sql: string, params?: unknown[]) => {
      if (/AS t$/.test(sql.trim())) return [{ t: '2026-10-29T23:00:00.000Z' }];
      const table = /FROM "([a-z_]+)"/.exec(sql)?.[1] ?? '';
      if (absent.includes(table)) throw missing();
      expect(params).toEqual(['u1']);
      return [{ n: String(counts[table] ?? 0) }];
    }),
  };
}

describe('usage (real counts against enforced limits only)', () => {
  it('reports the enforced material and course limits; AI and quiz use is counted for today without an invented cap', async () => {
    const s = new UsageService(
      db({ learner_materials: 3, personal_courses: 50, learning_resources: 2, learner_assessments: 1, assessment_attempts: 4, official_assessment_attempts: 1 }) as never,
    );
    const o = await s.getUsageOverview('u1');
    expect(o.plan).toBeNull();
    expect(o.quotas.documents).toMatchObject({ used: 3, limit: MAX_MATERIALS, remaining: MAX_MATERIALS - 3, period: 'total' });
    expect(o.quotas.courses).toMatchObject({ used: 50, limit: MAX_COURSES, remaining: 0 });
    expect(o.quotas.ai).toMatchObject({ used: 3, limit: null, remaining: null, period: 'day' });
    expect(o.quotas.ai.resetAt).toEqual(new Date('2026-10-29T23:00:00.000Z'));
    expect(o.quotas.quizzes).toMatchObject({ used: 5, limit: null, remaining: null });
  });

  it('a missing table counts as nothing used', async () => {
    const s = new UsageService(db({ assessment_attempts: 2 }, ['official_assessment_attempts', 'learner_materials']) as never);
    expect((await s.getQuizUsage('u1')).used).toBe(2);
    expect((await s.getDocumentUsage('u1')).used).toBe(0);
  });
});
