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
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserStreak } from './entities/user-streak.entity.js';
import { StreakHistory } from './entities/streak-history.entity.js';
import { CheckInDto, RecoverStreakDto } from './dto/streak.dto.js';
import { activeStreak, asDay, dayInZone, nextStreak, previousDay, streakTimeZone } from './streak-dates.js';

/**
 * Learning streak: consecutive calendar days (in the application time zone, see streak-dates.ts) on which the
 * learner did something that counts — completed a lesson, submitted a quiz/test/exam, reviewed a flashcard, or
 * pressed "Check in". Signing in or opening pages does not count.
 *
 * Previously only the manual check-in updated the streak, so learners who studied every day without pressing
 * "Check in" stayed at 0.
 */
@Injectable()
export class StreakService {
  private readonly logger = new Logger(StreakService.name);

  constructor(
    @InjectRepository(UserStreak)
    private streakRepo: Repository<UserStreak>,
    @InjectRepository(StreakHistory)
    private historyRepo: Repository<StreakHistory>,
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

  async getStreakStatus(userId: string, now = new Date()) {
    const streak = await this.getOrCreateUserStreak(userId);
    const today = dayInZone(now);
    const lastDay = asDay(streak.lastCheckInDate);
    const current = activeStreak(streak.currentStreak, lastDay, today);

    return {
      status: 'success',
      currentStreak: current,
      longestStreak: streak.longestStreak,
      checkedInToday: lastDay === today, // kept for existing clients: "today already counts"
      activeToday: lastDay === today,
      /** The streak that ended (restorable with a recovery token); 0 when the streak is alive. */
      brokenStreak: current === 0 && streak.currentStreak > 0 ? streak.currentStreak : 0,
      recoveryTokens: streak.recoveryTokens,
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
    return {
      status: 'success',
      totalCheckIns: history.length,
      history,
    };
  }

  async getStreakCalendar(userId: string) {
    const history = await this.historyRepo.find({
      where: { userId },
      order: { checkInDate: 'ASC' },
    });
    // one entry per day, even for rows written before duplicates were prevented
    const checkInDates = Array.from(new Set(history.map((h) => asDay(h.checkInDate)).filter((d): d is string => d !== null)));
    return {
      status: 'success',
      checkInDates,
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
      // another request changed the row first: re-read and decide again
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
    const streak = await this.getOrCreateUserStreak(userId);
    return {
      status: 'success',
      recoveryTokensAvailable: streak.recoveryTokens,
      canRecover: streak.recoveryTokens > 0,
    };
  }

  async recoverStreak(userId: string, dto?: RecoverStreakDto, now = new Date()) {
    const streak = await this.getOrCreateUserStreak(userId);

    if (streak.recoveryTokens <= 0) {
      throw new BadRequestException('No recovery tokens available to restore streak.');
    }

    const today = dayInZone(now);
    const yesterday = previousDay(today);
    const lastDay = asDay(streak.lastCheckInDate);
    if (lastDay === today) {
      throw new BadRequestException('Streak is already active for today. No recovery needed.');
    }
    if (lastDay === yesterday) {
      throw new BadRequestException('Your streak is not broken. Study today to keep it going.');
    }

    // Bridges the gap: the streak continues as if the learner was active yesterday
    streak.recoveryTokens -= 1;
    streak.lastCheckInDate = yesterday;
    if (streak.currentStreak === 0) {
      streak.currentStreak = 1;
    }

    await this.streakRepo.save(streak);

    return {
      status: 'success',
      message: `Streak successfully recovered using ${dto?.recoveryMethod || 'standard token'}!`,
      currentStreak: streak.currentStreak,
      recoveryTokensRemaining: streak.recoveryTokens,
    };
  }
}
