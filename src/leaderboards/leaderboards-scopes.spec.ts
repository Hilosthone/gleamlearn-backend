import { LeaderboardsService } from './leaderboards.service.js';

const users = [
  { id: 'u1', firstName: 'Ada', secondarySchool: 'Kings College', university: null, department: null },
  { id: 'u2', firstName: 'Bayo', secondarySchool: 'kings college ', university: 'UNILAG', department: null },
  { id: 'u3', firstName: 'Chi', secondarySchool: null, university: null, department: null },
];
function make(enrollments: { courseId: string; userId: string }[] = []) {
  const qb: any = { select: () => qb, addSelect: () => qb, where: () => qb, andWhere: () => qb, innerJoin: () => qb, groupBy: () => qb, orderBy: () => qb, limit: () => qb, getRawMany: async () => [{ userId: 'u1', totalXp: '90' }, { userId: 'u2', totalXp: '50' }, { userId: 'u3', totalXp: '10' }] };
  const userRepo = {
    findOne: async ({ where }: any) => users.find((u) => u.id === where.id) ?? null,
    manager: { getRepository: () => ({ find: async ({ where }: any) => enrollments.filter((e) => e.courseId === where.courseId) }) },
  };
  const status = { getStatus: async () => ({ exists: true, deleted: false, frozen: false }) };
  return new LeaderboardsService(userRepo as never, { createQueryBuilder: () => qb } as never, status as never);
}

describe('scoped leaderboards rank only the matching learners (never everyone)', () => {
  it('school: by name (case-insensitive) or the learner’s own school; nothing without one', async () => {
    const s = make();
    expect((await s.getSchoolLeaderboard('KINGS COLLEGE')).leaderboard.map((r: any) => r.userId)).toEqual(['u1', 'u2']);
    expect((await s.getSchoolLeaderboard(undefined, 'u2')).leaderboard.map((r: any) => r.userId)).toEqual(['u1', 'u2']);
    const none = await s.getSchoolLeaderboard(undefined, 'u3');
    expect(none.leaderboard).toEqual([]);
    expect(none.message).toMatch(/Add your school/);
    expect((await s.getUniversityLeaderboard('unilag')).leaderboard.map((r: any) => r.userId)).toEqual(['u2']);
  });

  it('course: only learners enrolled in that course; friends: unavailable instead of the global board', async () => {
    const s = make([{ courseId: 'c1', userId: 'u3' }, { courseId: 'c1', userId: 'u1' }]);
    expect((await s.getCourseLeaderboard('c1')).leaderboard.map((r: any) => [r.userId, r.rank])).toEqual([['u1', 1], ['u3', 2]]);
    expect((await s.getCourseLeaderboard('c2')).leaderboard).toEqual([]);
    await expect(s.getFriendsLeaderboard('u1')).rejects.toMatchObject({ status: 501 });
  });
});
