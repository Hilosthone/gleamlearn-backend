// // src/streak/streak.service.ts
// import { Injectable, BadRequestException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { UserStreak } from './entities/user-streak.entity.js';
// import { StreakHistory } from './entities/streak-history.entity.js';

// @Injectable()
// export class StreakService {
//   constructor(
//     @InjectRepository(UserStreak)
//     private streakRepo: Repository<UserStreak>,
//     @InjectRepository(StreakHistory)
//     private historyRepo: Repository<StreakHistory>,
//   ) {}

//   private async getOrCreateUserStreak(userId: string): Promise<UserStreak> {
//     let streak = await this.streakRepo.findOne({ where: { userId } });
//     if (!streak) {
//       streak = this.streakRepo.create({
//         userId,
//         currentStreak: 0,
//         longestStreak: 0,
//         recoveryTokens: 1,
//       });
//       await this.streakRepo.save(streak);
//     }
//     return streak;
//   }

//   async getStreakStatus(userId: string) {
//     const streak = await this.getOrCreateUserStreak(userId);
//     const today = new Date().toISOString().split('T')[0];
//     const checkedInToday = streak.lastCheckInDate === today;

//     return {
//       status: 'success',
//       currentStreak: streak.currentStreak,
//       longestStreak: streak.longestStreak,
//       checkedInToday,
//       recoveryTokens: streak.recoveryTokens,
//       lastCheckInDate: streak.lastCheckInDate,
//     };
//   }

//   async getStreakHistory(userId: string) {
//     const history = await this.historyRepo.find({
//       where: { userId },
//       order: { checkInDate: 'DESC' },
//     });
//     return {
//       status: 'success',
//       totalCheckIns: history.length,
//       history,
//     };
//   }

//   async getStreakCalendar(userId: string) {
//     // Fetches check-ins for the current calendar view
//     const history = await this.historyRepo.find({
//       where: { userId },
//       order: { checkInDate: 'ASC' },
//     });

//     const checkInDates = history.map((h) => h.checkInDate);

//     return {
//       status: 'success',
//       checkInDates,
//     };
//   }

//   async checkIn(userId: string) {
//     const streak = await this.getOrCreateUserStreak(userId);
//     const today = new Date().toISOString().split('T')[0];

//     if (streak.lastCheckInDate === today) {
//       throw new BadRequestException('You have already checked in today. Keep up the great work!');
//     }

//     const yesterday = new Date();
//     yesterday.setDate(yesterday.getDate() - 1);
//     const yesterdayStr = yesterday.toISOString().split('T')[0];

//     if (streak.lastCheckInDate === yesterdayStr) {
//       // Streak continues
//       streak.currentStreak += 1;
//     } else if (!streak.lastCheckInDate || streak.lastCheckInDate < yesterdayStr) {
//       // Streak broken, reset to 1
//       streak.currentStreak = 1;
//     }

//     if (streak.currentStreak > streak.longestStreak) {
//       streak.longestStreak = streak.currentStreak;
//     }

//     streak.lastCheckInDate = today;
//     await this.streakRepo.save(streak);

//     // Record check-in history entry
//     const historyEntry = this.historyRepo.create({
//       userId,
//       checkInDate: today,
//       activitySource: 'manual_check_in',
//     });
//     await this.historyRepo.save(historyEntry);

//     return {
//       status: 'success',
//       message: 'Streak check-in successful!',
//       currentStreak: streak.currentStreak,
//       longestStreak: streak.longestStreak,
//     };
//   }

//   async getRecoveryStatus(userId: string) {
//     const streak = await this.getOrCreateUserStreak(userId);
//     return {
//       status: 'success',
//       recoveryTokensAvailable: streak.recoveryTokens,
//       canRecover: streak.recoveryTokens > 0,
//     };
//   }

//   async recoverStreak(userId: string) {
//     const streak = await this.getOrCreateUserStreak(userId);

//     if (streak.recoveryTokens <= 0) {
//       throw new BadRequestException('No recovery tokens available to restore streak.');
//     }

//     const today = new Date().toISOString().split('T')[0];
//     if (streak.lastCheckInDate === today) {
//       throw new BadRequestException('Streak is already active for today. No recovery needed.');
//     }

//     // Deduct token and backdate last check-in to yesterday to bridge the gap
//     streak.recoveryTokens -= 1;
//     const yesterday = new Date();
//     yesterday.setDate(yesterday.getDate() - 1);
//     streak.lastCheckInDate = yesterday.toISOString().split('T')[0];
    
//     // Restore previous streak count (assuming a simulated minimal recovery count of at least 1)
//     if (streak.currentStreak === 0) {
//       streak.currentStreak = 1;
//     }

//     await this.streakRepo.save(streak);

//     return {
//       status: 'success',
//       message: 'Streak successfully recovered using a recovery token!',
//       currentStreak: streak.currentStreak,
//       recoveryTokensRemaining: streak.recoveryTokens,
//     };
//   }
// }



// src/streak/streak.service.ts
import { Injectable, BadRequestException, ConflictException, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { UserStreak } from './entities/user-streak.entity.js';
import { StreakHistory } from './entities/streak-history.entity.js';
import { StreakRecovery } from './entities/streak-recovery.entity.js';
import { CheckInDto, RecoverStreakDto } from './dto/streak.dto.js';
import { activeStreak, asDay, dayInZone, nextStreak, previousDay, streakTimeZone } from './streak-dates.js';
import { RECOVERY_SOURCE, addDays, calendarDays, monthKey, recoveryState, runEndingAt, type RecoveryState } from './streak-recovery.js';

/** How far back streak days are read to work out runs and gaps (longer streaks still keep their stored count). */
const HISTORY_WINDOW_DAYS = 400;

/**
 * Learning streak: consecutive calendar days (in the application time zone, see streak-dates.ts) on which the
 * learner opened GleamLearn signed in (POST /engagement/daily, once a day) or did something that counts — completed
 * a lesson, submitted a quiz/test/exam, reviewed a flashcard, or used the (legacy) check-in.
 *
 * Recovery (streak-recovery.ts): one recovery restores one missed day, at most 4 per calendar month, offered on the
 * day the learner comes back, and only when the whole gap can be closed. Every recovery is recorded in
 * streak_recoveries and as a streak day with source "streak_recovery".
 */
@Injectable()
export class StreakService {
  private readonly logger = new Logger(StreakService.name);

  constructor(
    @InjectRepository(UserStreak)
    private streakRepo: Repository<UserStreak>,
    @InjectRepository(StreakHistory)
    private historyRepo: Repository<StreakHistory>,
    @Optional()
    @InjectRepository(StreakRecovery)
    private recoveryRepo?: Repository<StreakRecovery>,
  ) {}

  private async getOrCreateUserStreak(userId: string): Promise<UserStreak> {
    let streak = await this.streakRepo.findOne({ where: { userId } });
    if (!streak) {
      try {
        streak = await this.streakRepo.save(this.streakRepo.create({ userId, currentStreak: 0, longestStreak: 0, recoveryTokens: 1 }));
      } catch (err) {
        // two first requests at once: the other one created the row (userId is unique)
        streak = await this.streakRepo.findOne({ where: { userId } });
        if (!streak) throw err;
      }
    }
    return streak;
  }

  /** Streak days (natural and recovered) in the recent window. */
  private async streakDays(userId: string, today: string) {
    const rows = await this.historyRepo.find({ where: { userId, checkInDate: MoreThanOrEqual(addDays(today, -HISTORY_WINDOW_DAYS)) as never } });
    const natural = new Set<string>();
    const recovered = new Set<string>();
    for (const r of rows) {
      const d = asDay(r.checkInDate);
      if (!d) continue;
      (r.activitySource === RECOVERY_SOURCE ? recovered : natural).add(d);
    }
    for (const d of recovered) natural.delete(d); // a day is either one or the other
    return { natural, recovered, all: new Set([...natural, ...recovered]) };
  }

  private async usedThisMonth(userId: string, today: string): Promise<number> {
    return this.recoveryRepo ? this.recoveryRepo.count({ where: { userId, monthKey: monthKey(today) } }) : 0;
  }

  async recoveryStatus(userId: string, now = new Date()): Promise<RecoveryState> {
    const today = dayInZone(now);
    const { all } = await this.streakDays(userId, today);
    return recoveryState(all, today, await this.usedThisMonth(userId, today));
  }

  async getStreakStatus(userId: string, now = new Date()) {
    const streak = await this.getOrCreateUserStreak(userId);
    const today = dayInZone(now);
    const lastDay = asDay(streak.lastCheckInDate);
    const current = activeStreak(streak.currentStreak, lastDay, today);
    const recovery = await this.recoveryStatus(userId, now);
    // a break is either recoverable today (the learner came back) or, before today counts, simply ended
    const brokenStreak = recovery.missedDays.length ? recovery.brokenStreak : current === 0 && streak.currentStreak > 0 ? streak.currentStreak : 0;

    return {
      status: 'success',
      currentStreak: current,
      longestStreak: streak.longestStreak,
      checkedInToday: lastDay === today, // kept for existing clients: "today already counts"
      activeToday: lastDay === today,
      /** The streak that ended; 0 when the streak is alive. */
      brokenStreak,
      /** Kept for existing clients: now the recoveries left this calendar month. */
      recoveryTokens: recovery.remainingThisMonth,
      recovery,
      lastCheckInDate: lastDay,
      today,
      timeZone: streakTimeZone(),
    };
  }

  async getStreakHistory(userId: string) {
    const history = await this.historyRepo.find({
      where: { userId },
      order: { checkInDate: 'DESC' },
    });
    const recoveries = this.recoveryRepo ? await this.recoveryRepo.find({ where: { userId }, order: { missedDate: 'DESC' } }) : [];
    return {
      status: 'success',
      totalCheckIns: history.length,
      history,
      recoveries: recoveries.map((r) => ({ missedDate: asDay(r.missedDate), recoveredOn: asDay(r.recoveredOn), streakBefore: r.streakBefore, createdAt: r.createdAt })),
    };
  }

  /**
   * Streak days for a calendar. `checkInDates` (every streak day, oldest first) is kept for existing clients; `days`
   * marks each day of `month` (YYYY-MM, default this month) as active, recovered, missed or today_pending.
   */
  async getStreakCalendar(userId: string, month?: string, now = new Date()) {
    const today = dayInZone(now);
    const wanted = month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) && month <= monthKey(today) ? month : monthKey(today);
    const history = await this.historyRepo.find({ where: { userId }, order: { checkInDate: 'ASC' } });
    const natural = new Set<string>();
    const recovered = new Set<string>();
    for (const h of history) {
      const d = asDay(h.checkInDate);
      if (d) (h.activitySource === RECOVERY_SOURCE ? recovered : natural).add(d);
    }
    for (const d of recovered) natural.delete(d);
    const streak = await this.getOrCreateUserStreak(userId);
    const lastDay = asDay(streak.lastCheckInDate);
    return {
      status: 'success',
      checkInDates: [...new Set([...natural, ...recovered])].sort(),
      month: wanted,
      days: calendarDays(natural, recovered, wanted, today),
      currentStreak: activeStreak(streak.currentStreak, lastDay, today),
      longestStreak: streak.longestStreak,
      today,
      timeZone: streakTimeZone(),
    };
  }

  /**
   * Records qualifying activity for today. Idempotent per day: a second activity the same day changes nothing.
   * The update is conditional on the last active day read, so two concurrent activities cannot both count.
   */
  async recordActivity(userId: string, source: string, now = new Date()): Promise<{ counted: boolean; currentStreak: number; longestStreak: number }> {
    const today = dayInZone(now);
    for (let attempt = 0; attempt < 3; attempt++) {
      const streak = await this.getOrCreateUserStreak(userId);
      const lastDay = asDay(streak.lastCheckInDate);
      const next = nextStreak(streak.currentStreak, lastDay, today);
      if (!next.counted) return { counted: false, currentStreak: streak.currentStreak, longestStreak: streak.longestStreak };

      const longest = Math.max(streak.longestStreak, next.current);
      const qb = this.streakRepo
        .createQueryBuilder()
        .update(UserStreak)
        .set({ currentStreak: next.current, longestStreak: longest, lastCheckInDate: today })
        .where('"userId" = :userId', { userId });
      if (lastDay) qb.andWhere('"lastCheckInDate" = :lastDay', { lastDay });
      else qb.andWhere('"lastCheckInDate" IS NULL');
      const res = await qb.execute();
      if (res.affected === 1) {
        await this.historyRepo.save(this.historyRepo.create({ userId, checkInDate: today, activitySource: source }));
        return { counted: true, currentStreak: next.current, longestStreak: longest };
      }
      // another request updated the streak in between: read again (it most likely counted today already)
    }
    this.logger.warn(`streak update for ${userId} kept conflicting; activity not counted`);
    const s = await this.getOrCreateUserStreak(userId);
    return { counted: false, currentStreak: s.currentStreak, longestStreak: s.longestStreak };
  }

  async checkIn(userId: string, dto?: CheckInDto) {
    const result = await this.recordActivity(userId, dto?.activitySource || 'manual_check_in');
    if (!result.counted) {
      throw new BadRequestException('Today already counts towards your streak. Keep up the great work!');
    }
    return {
      status: 'success',
      message: 'Streak check-in successful!',
      currentStreak: result.currentStreak,
      longestStreak: result.longestStreak,
    };
  }

  async getRecoveryStatus(userId: string) {
    const recovery = await this.recoveryStatus(userId);
    return {
      status: 'success',
      recoveryTokensAvailable: recovery.remainingThisMonth, // kept for existing clients
      canRecover: recovery.recoverable,
      ...recovery,
    };
  }

  /**
   * Restores ONE missed day (the oldest of the gap), when the learner asks for it. Runs in one transaction with
   * the learner's streak row locked, so concurrent or repeated calls are applied one at a time; the unique key on
   * (user, missed day) makes recovering the same day twice impossible. Sending `missedDate` (the day shown to the
   * learner) makes a repeated request harmless: a day already recovered returns the current state.
   */
  async recoverStreak(userId: string, dto?: RecoverStreakDto, now = new Date()) {
    if (!this.recoveryRepo) throw new ConflictException('Streak recovery is not available.');
    // coming back counts for today (the visit), which is what makes the gap recoverable
    await this.recordActivity(userId, 'daily_visit', now);
    const today = dayInZone(now);
    const wanted = dto?.missedDate;

    return this.streakRepo.manager.transaction(async (m) => {
      await m.query(`SELECT 1 FROM "user_streaks" WHERE "userId" = $1 FOR UPDATE`, [userId]);
      const done = wanted ? await m.findOne(StreakRecovery, { where: { userId, missedDate: wanted } }) : null;

      const rows = await m.find(StreakHistory, { where: { userId, checkInDate: MoreThanOrEqual(addDays(today, -HISTORY_WINDOW_DAYS)) as never } });
      const days = new Set(rows.map((r) => asDay(r.checkInDate)).filter((d): d is string => !!d));
      const used = await m.count(StreakRecovery, { where: { userId, monthKey: monthKey(today) } });
      const state = recoveryState(days, today, used);

      if (done) return this.recoveryResult(m, userId, today, days, state, `That day is already recovered.`);
      if (!state.missedDays.length) throw new BadRequestException('Your streak is not broken, so there is nothing to recover.');
      if (!state.recoverable) {
        throw new BadRequestException(
          state.reason === 'allowance_exhausted'
            ? `You have used all ${state.monthlyAllowance} streak recoveries this month. Your streak continues from today.`
            : `You missed ${state.missedDays.length} days but have ${state.remainingThisMonth} recover${state.remainingThisMonth === 1 ? 'y' : 'ies'} left this month, so this gap cannot be recovered. Your streak continues from today.`,
        );
      }
      if (wanted && wanted !== state.nextMissedDay) throw new ConflictException('That day cannot be recovered now. Refresh to see your streak.');

      const missed = state.nextMissedDay!;
      await m.insert(StreakRecovery, { userId, missedDate: missed, recoveredOn: today, monthKey: monthKey(today), streakBefore: state.brokenStreak });
      await m.insert(StreakHistory, { userId, checkInDate: missed, activitySource: RECOVERY_SOURCE });
      days.add(missed);
      const after = recoveryState(days, today, used + 1);
      return this.recoveryResult(m, userId, today, days, after, after.missedDays.length ? `Recovered ${missed}. ${after.missedDays.length} more day${after.missedDays.length === 1 ? '' : 's'} to recover.` : `Streak restored! Recovered ${missed}.`);
    });
  }

  /** Stores the streak that the streak days now give (recovered days count) and reports it. */
  private async recoveryResult(m: Repository<UserStreak>['manager'], userId: string, today: string, days: Set<string>, state: RecoveryState, message: string) {
    const current = runEndingAt(days, today);
    const row = await m.findOne(UserStreak, { where: { userId } });
    const longest = Math.max(row?.longestStreak ?? 0, current);
    await m.update(UserStreak, { userId }, { currentStreak: current, longestStreak: longest, lastCheckInDate: today });
    this.logger.log(`streak recovery user=${userId} current=${current} remainingThisMonth=${state.remainingThisMonth}`);
    return {
      status: 'success',
      message,
      currentStreak: current,
      longestStreak: longest,
      recoveryTokensRemaining: state.remainingThisMonth, // kept for existing clients
      recovery: state,
    };
  }

  /** The yesterday of `today` (exposed for the engagement service's messages). */
  static yesterdayOf(today: string) {
    return previousDay(today);
  }
}
