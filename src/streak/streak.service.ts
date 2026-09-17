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
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserStreak } from './entities/user-streak.entity.js';
import { StreakHistory } from './entities/streak-history.entity.js';
import { CheckInDto, RecoverStreakDto } from './dto/streak.dto.js';

@Injectable()
export class StreakService {
  constructor(
    @InjectRepository(UserStreak)
    private streakRepo: Repository<UserStreak>,
    @InjectRepository(StreakHistory)
    private historyRepo: Repository<StreakHistory>,
  ) {}

  private async getOrCreateUserStreak(userId: string): Promise<UserStreak> {
    let streak = await this.streakRepo.findOne({ where: { userId } });
    if (!streak) {
      streak = this.streakRepo.create({
        userId,
        currentStreak: 0,
        longestStreak: 0,
        recoveryTokens: 1,
      });
      await this.streakRepo.save(streak);
    }
    return streak;
  }

  async getStreakStatus(userId: string) {
    const streak = await this.getOrCreateUserStreak(userId);
    const today = new Date().toISOString().split('T')[0];
    const checkedInToday = streak.lastCheckInDate === today;

    return {
      status: 'success',
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      checkedInToday,
      recoveryTokens: streak.recoveryTokens,
      lastCheckInDate: streak.lastCheckInDate,
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

    const checkInDates = history.map((h) => h.checkInDate);

    return {
      status: 'success',
      checkInDates,
    };
  }

  async checkIn(userId: string, dto?: CheckInDto) {
    const streak = await this.getOrCreateUserStreak(userId);
    const today = new Date().toISOString().split('T')[0];

    if (streak.lastCheckInDate === today) {
      throw new BadRequestException('You have already checked in today. Keep up the great work!');
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (streak.lastCheckInDate === yesterdayStr) {
      streak.currentStreak += 1;
    } else if (!streak.lastCheckInDate || streak.lastCheckInDate < yesterdayStr) {
      streak.currentStreak = 1;
    }

    if (streak.currentStreak > streak.longestStreak) {
      streak.longestStreak = streak.currentStreak;
    }

    streak.lastCheckInDate = today;
    await this.streakRepo.save(streak);

    const historyEntry = this.historyRepo.create({
      userId,
      checkInDate: today,
      activitySource: dto?.activitySource || 'manual_check_in',
    });
    await this.historyRepo.save(historyEntry);

    return {
      status: 'success',
      message: 'Streak check-in successful!',
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
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

  async recoverStreak(userId: string, dto?: RecoverStreakDto) {
    const streak = await this.getOrCreateUserStreak(userId);

    if (streak.recoveryTokens <= 0) {
      throw new BadRequestException('No recovery tokens available to restore streak.');
    }

    const today = new Date().toISOString().split('T')[0];
    if (streak.lastCheckInDate === today) {
      throw new BadRequestException('Streak is already active for today. No recovery needed.');
    }

    streak.recoveryTokens -= 1;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    streak.lastCheckInDate = yesterday.toISOString().split('T')[0];
    
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