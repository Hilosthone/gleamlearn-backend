import { LeaderboardsService } from './leaderboards.service.js';
import { fakeQueryBuilder } from '../../test/support/fake-query-builder.js';

const active = { exists: true, restricted: false, restrictionReason: null, frozen: false, deleted: false, role: 'student' };

function build(xpRows: Array<{ userId: string; totalXp: string }>, users: Record<string, Record<string, unknown>>, statusById: Record<string, Partial<typeof active>> = {}) {
  const qb = fakeQueryBuilder('tx', {});
  Object.assign(qb, { addSelect: () => qb, groupBy: () => qb, limit: () => qb, getRawMany: async () => xpRows });
  const xpRepo = { createQueryBuilder: () => qb };
  const userRepo = { findOne: vi.fn(async ({ where }: any) => users[where.id] ?? null) };
  const accountStatus = { getStatus: vi.fn(async (id: string) => ({ ...active, ...statusById[id] })) };
  return new LeaderboardsService(userRepo as never, xpRepo as never, accountStatus as never);
}

describe('LeaderboardsService (public)', () => {
  const xp = [
    { userId: 'a', totalXp: '900' },
    { userId: 'deleted', totalXp: '800' },
    { userId: 'gone', totalXp: '700' },
    { userId: 'b', totalXp: '600' },
    { userId: 'frozen', totalXp: '500' },
  ];
  const users = {
    a: { id: 'a', fullName: 'Ada', email: 'ada@example.com', country: 'Nigeria' },
    deleted: { id: 'deleted', fullName: 'Deleted Person', country: 'Nigeria' },
    b: { id: 'b', fullName: 'Grace', country: 'Ghana' },
    frozen: { id: 'frozen', fullName: 'Frozen Person', country: 'Ghana' },
  };
  const status = { deleted: { deleted: true }, frozen: { frozen: true } };

  it('leaves out deleted, frozen and missing accounts and ranks without gaps', async () => {
    const res: any = await build(xp, users, status).getGlobalLeaderboard();
    expect(res.leaderboard).toEqual([
      { rank: 1, userId: 'a', name: 'Ada', totalXp: 900 },
      { rank: 2, userId: 'b', name: 'Grace', totalXp: 600 },
    ]);
    expect(JSON.stringify(res)).not.toMatch(/Deleted Person|Frozen Person|Scholar|@/);
  });

  it('filtered boards are ranked from 1 after filtering', async () => {
    const res: any = await build(xp, users, status).getCountryLeaderboard('Ghana');
    expect(res.leaderboard).toEqual([{ rank: 1, userId: 'b', name: 'Grace', totalXp: 600 }]);
  });
});
