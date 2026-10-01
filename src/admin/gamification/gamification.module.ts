import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GamificationController } from './gamification.controller.js';
import { GamificationService } from './gamification.service.js';
import { User } from '../../users/users.entity.js';
import { XpTransaction } from '../../xp/entities/xp-transaction.entity.js';
import { CoinTransaction } from '../../coins/entities/coin-transaction.entity.js';
import { UserStreak } from '../../streak/entities/user-streak.entity.js';
import { ActivityLog } from '../activity/entities/activity-log.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      XpTransaction,
      CoinTransaction,
      UserStreak,
      ActivityLog,
    ]),
  ],
  controllers: [GamificationController],
  providers: [GamificationService],
  exports: [GamificationService],
})
export class GamificationModule {}