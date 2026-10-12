import { DashboardService } from './dashboard.service.js';
import { User } from '../../auth/entities/user.entity.js';
import { Quiz } from '../../quizzes/entities/quiz.entity.js';
import { XpTransaction } from '../../xp/entities/xp-transaction.entity.js';
import { CoinTransaction } from '../../coins/entities/coin-transaction.entity.js';

describe('DashboardService.getVerifiedCounts', () => {
  function build(overrides: Map<unknown, { count?: () => Promise<number>; sum?: () => Promise<number | null> }> = new Map()) {
    const getRepository = vi.fn((entity: unknown) => ({
      count: overrides.get(entity)?.count ?? vi.fn(async () => 7),
      sum: overrides.get(entity)?.sum ?? vi.fn(async () => 120),
    }));
    return { service: new DashboardService({} as any, {} as any, { getRepository } as any), getRepository };
  }

  it('returns exact counts and positive sums from the database, no estimates', async () => {
    const { service, getRepository } = build(
      new Map<unknown, any>([
        [User, { count: vi.fn(async (opts?: any) => (opts ? 3 : 42)) }],
        [Quiz, { count: vi.fn(async () => 5) }],
        [XpTransaction, { sum: vi.fn(async () => 900) }],
        [CoinTransaction, { sum: vi.fn(async () => null) }], // no rows → 0, not invented
      ]),
    );
    const res = await service.getVerifiedCounts();
    expect(res.data.counts).toMatchObject({ learners: 42, newLearnersLast30Days: 3, quizzes: 5, xpAwarded: 900, coinsAwarded: 0 });
    expect(res.data.unavailable).toEqual([]);
    expect(Object.keys(res.data.counts)).toHaveLength(12);
    expect(getRepository).toHaveBeenCalledWith(User);
  });

  it('reports a failing metric as null and lists it, without failing the others', async () => {
    const { service } = build(new Map<unknown, any>([[Quiz, { count: vi.fn(async () => { throw new Error('relation "quizzes" does not exist'); }) }]]));
    const res = await service.getVerifiedCounts();
    expect(res.data.counts.quizzes).toBeNull();
    expect(res.data.unavailable).toEqual(['quizzes']);
    expect(res.data.counts.learners).toBe(7);
    expect(JSON.stringify(res)).not.toContain('relation');
  });
});
