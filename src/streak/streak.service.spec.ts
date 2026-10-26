import { BadRequestException } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { activeStreak, dayInZone, nextStreak, previousDay } from './streak-dates.js';
import { StreakService } from './streak.service.js';
import { CountsTowardStreak, STREAK_ACTIVITY_KEY, StreakActivityInterceptor } from './streak-activity.js';
import { LessonsController } from '../lessons/lessons.controller.js';
import { FlashcardsController } from '../flashcards/flashcards.controller.js';
import { QuizzesController } from '../quizzes/quizzes.controller.js';
import { TestsController } from '../tests/tests.controller.js';
import { ExamsController } from '../exams/exams.controller.js';

/** In-memory user_streaks + streak_history with the conditional update the service relies on. */
function fakeRepos(initial?: { currentStreak: number; longestStreak: number; lastCheckInDate: string | null }) {
  let row: any = initial ? { id: 's1', userId: 'u1', recoveryTokens: 1, ...initial } : null;
  const history: any[] = [];
  let interfere: (() => void) | null = null; // simulates another request winning between read and write
  const streakRepo = {
    findOne: vi.fn(async () => (row ? { ...row } : null)),
    create: vi.fn((d: any) => d),
    save: vi.fn(async (d: any) => (row = { id: 's1', ...d })),
    createQueryBuilder: () => {
      const conds: { last?: string | null } = {};
      let values: any;
      const qb: any = {
        update: () => qb,
        set: (v: any) => ((values = v), qb),
        where: () => qb,
        andWhere: (sql: string, params?: any) => ((conds.last = sql.includes('IS NULL') ? null : params.lastDay), qb),
        execute: async () => {
          if (interfere) {
            interfere();
            interfere = null;
          }
          if ((row.lastCheckInDate ?? null) !== conds.last) return { affected: 0 };
          Object.assign(row, values);
          return { affected: 1 };
        },
      };
      return qb;
    },
  };
  const historyRepo = { create: (d: any) => d, save: vi.fn(async (d: any) => history.push(d)), find: vi.fn(async () => history) };
  const service = new StreakService(streakRepo as never, historyRepo as never);
  return { service, history, get row() { return row; }, interfereOnce: (fn: () => void) => (interfere = fn) };
}

// 10:00 in Lagos (09:00 UTC) on consecutive days
const day = (ymd: string, utcHour = 9) => new Date(`${ymd}T${String(utcHour).padStart(2, '0')}:00:00Z`);

describe('streak dates (Africa/Lagos)', () => {
  it('uses the Lagos calendar day, not UTC: 23:30 UTC is already the next day in Lagos', () => {
    expect(dayInZone(new Date('2026-10-26T23:30:00Z'), 'Africa/Lagos')).toBe('2026-10-27');
    expect(dayInZone(new Date('2026-10-26T22:59:00Z'), 'Africa/Lagos')).toBe('2026-10-26');
  });
  it('previous day crosses months and years', () => {
    expect(previousDay('2026-03-01')).toBe('2026-02-28');
    expect(previousDay('2027-01-01')).toBe('2026-12-31');
  });
  it('rules: first day 1, same day unchanged, next day +1, gap resets to 1', () => {
    expect(nextStreak(0, null, '2026-10-26')).toEqual({ current: 1, counted: true });
    expect(nextStreak(3, '2026-10-26', '2026-10-26')).toEqual({ current: 3, counted: false });
    expect(nextStreak(3, '2026-10-25', '2026-10-26')).toEqual({ current: 4, counted: true });
    expect(nextStreak(3, '2026-10-24', '2026-10-26')).toEqual({ current: 1, counted: true });
  });
  it('a streak whose last day is before yesterday shows as 0', () => {
    expect(activeStreak(5, '2026-10-25', '2026-10-26')).toBe(5);
    expect(activeStreak(5, '2026-10-24', '2026-10-26')).toBe(0);
  });
});

describe('StreakService.recordActivity', () => {
  it('a new learner: first activity gives 1; more activity that day changes nothing and writes no extra history', async () => {
    const t = fakeRepos();
    expect(await t.service.recordActivity('u1', 'lesson_completed', day('2026-10-26'))).toMatchObject({ counted: true, currentStreak: 1 });
    expect(await t.service.recordActivity('u1', 'quiz_submitted', day('2026-10-26', 20))).toMatchObject({ counted: false, currentStreak: 1 });
    expect(t.history.map((h) => h.checkInDate)).toEqual(['2026-10-26']);
  });

  it('consecutive days count up and raise the longest streak', async () => {
    const t = fakeRepos();
    for (const d of ['2026-10-24', '2026-10-25', '2026-10-26']) await t.service.recordActivity('u1', 'lesson_completed', day(d));
    expect(t.row).toMatchObject({ currentStreak: 3, longestStreak: 3, lastCheckInDate: '2026-10-26' });
  });

  it('a missed day resets to 1 when activity resumes and keeps the longest streak', async () => {
    const t = fakeRepos({ currentStreak: 4, longestStreak: 6, lastCheckInDate: '2026-10-23' });
    expect(await t.service.recordActivity('u1', 'flashcard_review', day('2026-10-25'))).toMatchObject({ counted: true, currentStreak: 1, longestStreak: 6 });
  });

  it('activity at 00:30 in Lagos counts for the new Lagos day (it used to count for the previous UTC day)', async () => {
    const t = fakeRepos({ currentStreak: 2, longestStreak: 2, lastCheckInDate: '2026-10-26' });
    const r = await t.service.recordActivity('u1', 'lesson_completed', new Date('2026-10-26T23:30:00Z'));
    expect(r).toMatchObject({ counted: true, currentStreak: 3 });
    expect(t.row.lastCheckInDate).toBe('2026-10-27');
  });

  it('an existing record stuck at 0 starts at 1 on the next activity (no invented history)', async () => {
    const t = fakeRepos({ currentStreak: 0, longestStreak: 0, lastCheckInDate: null });
    expect(await t.service.recordActivity('u1', 'lesson_completed', day('2026-10-26'))).toMatchObject({ counted: true, currentStreak: 1 });
    expect(t.history).toHaveLength(1);
  });

  it('when another request counts the day first, this one does not count it again', async () => {
    const t = fakeRepos({ currentStreak: 1, longestStreak: 1, lastCheckInDate: '2026-10-25' });
    t.interfereOnce(() => Object.assign(t.row, { currentStreak: 2, longestStreak: 2, lastCheckInDate: '2026-10-26' }));
    const r = await t.service.recordActivity('u1', 'quiz_submitted', day('2026-10-26'));
    expect(r).toMatchObject({ counted: false, currentStreak: 2 });
    expect(t.history).toHaveLength(0);
  });
});

describe('StreakService status, check-in and recovery', () => {
  it('status shows a broken streak as 0, with the ended streak for recovery, and the app day', async () => {
    const t = fakeRepos({ currentStreak: 5, longestStreak: 5, lastCheckInDate: '2026-10-23' });
    const s = await t.service.getStreakStatus('u1', day('2026-10-26'));
    expect(s).toMatchObject({ currentStreak: 0, brokenStreak: 5, longestStreak: 5, activeToday: false, today: '2026-10-26', timeZone: 'Africa/Lagos' });
  });

  it('manual check-in counts once a day', async () => {
    const t = fakeRepos();
    const today = dayInZone(new Date());
    await expect(t.service.checkIn('u1')).resolves.toMatchObject({ currentStreak: 1 });
    await expect(t.service.checkIn('u1')).rejects.toBeInstanceOf(BadRequestException);
    expect(t.row.lastCheckInDate).toBe(today);
  });

  it('recovery is refused while the streak is still alive (no wasted token)', async () => {
    const t = fakeRepos({ currentStreak: 3, longestStreak: 3, lastCheckInDate: '2026-10-25' });
    await expect(t.service.recoverStreak('u1', undefined, day('2026-10-26'))).rejects.toThrow('not broken');
    expect(t.row.recoveryTokens).toBe(1);
  });

  it('recovery bridges a broken streak', async () => {
    const t = fakeRepos({ currentStreak: 3, longestStreak: 3, lastCheckInDate: '2026-10-22' });
    await t.service.recoverStreak('u1', undefined, day('2026-10-26'));
    expect(t.row).toMatchObject({ lastCheckInDate: '2026-10-25', currentStreak: 3, recoveryTokens: 0 });
  });
});

describe('learning activity is recorded by the interceptor', () => {
  const make = (source?: string) => {
    const handler = () => undefined;
    if (source) CountsTowardStreak(source)(handler, 'x', { value: handler } as never);
    const streaks = { recordActivity: vi.fn(async () => ({ counted: true })) };
    const reflector = { get: (key: string, h: unknown) => Reflect.getMetadata(key, h as object) };
    const ctx: any = { getHandler: () => handler, getType: () => 'http', switchToHttp: () => ({ getRequest: () => ({ user: { id: 'u1' } }) }) };
    return { interceptor: new StreakActivityInterceptor(reflector as never, streaks as never), streaks, ctx };
  };

  it('records after a successful marked route', async () => {
    const { interceptor, streaks, ctx } = make('lesson_completed');
    await expect(lastValueFrom(interceptor.intercept(ctx, { handle: () => of({ ok: true }) }))).resolves.toEqual({ ok: true });
    expect(streaks.recordActivity).toHaveBeenCalledWith('u1', 'lesson_completed');
  });

  it('does not record when the route fails, or for unmarked routes', async () => {
    const failed = make('quiz_submitted');
    await expect(lastValueFrom(failed.interceptor.intercept(failed.ctx, { handle: () => throwError(() => new Error('400')) }))).rejects.toThrow('400');
    expect(failed.streaks.recordActivity).not.toHaveBeenCalled();
    const plain = make();
    await lastValueFrom(plain.interceptor.intercept(plain.ctx, { handle: () => of(1) }));
    expect(plain.streaks.recordActivity).not.toHaveBeenCalled();
  });

  it('a streak error never fails the learning action', async () => {
    const { interceptor, streaks, ctx } = make('lesson_completed');
    streaks.recordActivity.mockRejectedValueOnce(new Error('db down'));
    await expect(lastValueFrom(interceptor.intercept(ctx, { handle: () => of('done') }))).resolves.toBe('done');
  });

  it.each([
    [LessonsController, 'completeLesson', 'lesson_completed'],
    [FlashcardsController, 'reviewCard', 'flashcard_review'],
    [QuizzesController, 'submitAttempt', 'quiz_submitted'],
    [TestsController, 'submitAttempt', 'test_submitted'],
    [ExamsController, 'submitAttempt', 'exam_submitted'],
  ])('%p.%s counts as %s', (ctrl: any, method, source) => {
    expect(Reflect.getMetadata(STREAK_ACTIVITY_KEY, ctrl.prototype[method])).toBe(source);
  });
});
