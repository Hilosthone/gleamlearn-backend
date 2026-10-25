import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UserAchievement } from '../gamification/entities/user-achievement.entity.js';
import { UserStreak } from '../streak/entities/user-streak.entity.js';
import { Enrollment } from '../courses/entities/enrollment.entity.js';
import { StudySession } from '../study-sessions/entities/study-session.entity.js';
import { fakeQueryBuilder } from '../../test/support/fake-query-builder.js';

const ada = {
  id: 'u1',
  username: 'ada',
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  passwordHash: 'hash',
  verificationOtp: '123456',
  educationType: 'University',
  university: 'Test University',
  level: '300 Level',
  createdAt: new Date('2026-10-01T00:00:00Z'),
};
const active = { exists: true, restricted: false, restrictionReason: null, frozen: false, deleted: false, role: 'student' };

function build(opts: {
  user?: Record<string, unknown> | null;
  status?: Partial<typeof active>;
  achievements?: unknown[];
  streak?: unknown;
  completed?: number;
  seconds?: unknown;
}) {
  const userRepo = { findOne: vi.fn(async () => (opts.user === undefined ? ada : opts.user)) };
  const accountStatus = { getStatus: vi.fn(async () => ({ ...active, ...opts.status })) };
  const repos = new Map<unknown, unknown>([
    [UserAchievement, { find: vi.fn(async () => opts.achievements ?? []) }],
    [UserStreak, { findOne: vi.fn(async () => opts.streak ?? null) }],
    [Enrollment, { createQueryBuilder: () => fakeQueryBuilder('e', { count: opts.completed ?? 0 }) }],
    [StudySession, { createQueryBuilder: () => fakeQueryBuilder('s', { raw: opts.seconds ?? { total: '0' } }) }],
  ]);
  const dataSource = { getRepository: vi.fn((entity: unknown) => repos.get(entity)) };
  return { service: new UsersService(userRepo as never, accountStatus as never, dataSource as never), dataSource };
}

describe('public profiles', () => {
  it.each([
    ['deleted', { deleted: true }],
    ['frozen', { frozen: true }],
    ['missing (status row gone)', { exists: false }],
  ])('a %s account is "not found" on every public endpoint, with the same message', async (_label, status) => {
    const { service, dataSource } = build({ status });
    for (const call of [service.getPublicProfile('ada'), service.getUserAchievements('ada'), service.getUserStats('ada')]) {
      await expect(call).rejects.toThrow(new NotFoundException('User @ada not found'));
    }
    expect(dataSource.getRepository).not.toHaveBeenCalled();
  });

  it('an unknown username is "not found" with the same message', async () => {
    const { service } = build({ user: null });
    await expect(service.getPublicProfile('ghost')).rejects.toThrow(new NotFoundException('User @ghost not found'));
  });

  it('an active profile shows only public fields, with the stored level', async () => {
    const profile = await build({}).service.getPublicProfile('ada');
    expect(profile).toEqual({
      fullName: 'Ada Lovelace',
      username: 'ada',
      educationType: 'University',
      university: 'Test University',
      secondarySchool: undefined,
      department: undefined,
      level: '300 Level',
      createdAt: ada.createdAt,
    });
    expect(JSON.stringify(profile)).not.toMatch(/ada@example\.com|hash|123456/);
  });

  it('achievements are the ones actually unlocked, never a fabricated "Early Bird"', async () => {
    const unlockedAt = new Date('2026-10-05T00:00:00Z');
    const none = await build({}).service.getUserAchievements('ada');
    expect(none).toEqual({ username: 'ada', achievements: [] });
    const some = await build({
      achievements: [{ unlockedAt, achievement: { title: 'First Quiz', description: 'Finished a quiz', rewardXp: 10 } }, { unlockedAt, achievement: null }],
    }).service.getUserAchievements('ada');
    expect(some).toEqual({ username: 'ada', achievements: [{ title: 'First Quiz', description: 'Finished a quiz', unlockedAt }] });
    expect(JSON.stringify(some)).not.toContain('Early Bird');
  });

  it('stats come from the real tables (no placeholder 1-day streak)', async () => {
    const fresh = await build({}).service.getUserStats('ada');
    expect(fresh).toEqual({ username: 'ada', currentStreakDays: 0, completedCoursesCount: 0, totalHoursLearned: 0 });
    const busy = await build({ streak: { currentStreak: 5 }, completed: 2, seconds: { total: '5400' } }).service.getUserStats('ada');
    expect(busy).toEqual({ username: 'ada', currentStreakDays: 5, completedCoursesCount: 2, totalHoursLearned: 1.5 });
  });
});
