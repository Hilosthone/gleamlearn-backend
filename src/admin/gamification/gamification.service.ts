import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/users.entity.js'; 
import { XpTransaction } from '../../xp/entities/xp-transaction.entity.js';
import { CoinTransaction } from '../../coins/entities/coin-transaction.entity.js';
import { UserStreak } from '../../streak/entities/user-streak.entity.js';
import { ActivityLog } from '../activity/entities/activity-log.entity.js';
import { ManualAdjustmentDto } from './dto/manual-adjustment.dto.js';
import { GamificationQueryDto } from './dto/gamification-query.dto.js';

@Injectable()
export class GamificationService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(XpTransaction)
    private readonly xpTransactionRepo: Repository<XpTransaction>,
    @InjectRepository(CoinTransaction)
    private readonly coinTransactionRepo: Repository<CoinTransaction>,
    @InjectRepository(UserStreak)
    private readonly streakRepo: Repository<UserStreak>,
    @InjectRepository(ActivityLog)
    private readonly auditRepo: Repository<ActivityLog>,
  ) {}

  async getXpOverview() {
    return {
      status: 'success',
      data: {
        totalXpGenerated: 1450000,
        averageUserXp: 1450,
        topXpEarner: { email: 'student@gleamlearn.com', xp: 12500 },
      },
    };
  }

  async getCoinsOverview() {
    return {
      status: 'success',
      data: {
        totalCoinsCirculating: 89000,
        totalCoinsSpent: 34000,
      },
    };
  }

  async getStreaksOverview() {
    return {
      status: 'success',
      data: {
        activeStreaksCount: 320,
        longestActiveStreak: 45,
        averageStreakDays: 5.4,
      },
    };
  }

  async getLeaderboards(query: GamificationQueryDto) {
    const { page = 1, limit = 10 } = query;
    // Query users ordered by XP or coins
    return {
      status: 'success',
      data: {
        leaderboard: [
          { rank: 1, email: 'student@gleamlearn.com', xp: 12500, coins: 450, streak: 45 },
        ],
        pagination: { total: 1, page, limit, totalPages: 1 },
      },
    };
  }

  async adjustUserXp(userId: string, dto: ManualAdjustmentDto, adminId: string, adminEmail: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Create XP transaction record
    const xpTx = this.xpTransactionRepo.create({
      userId,
      amount: dto.amount,
      source: 'ADMIN_MANUAL_ADJUSTMENT',
      description: dto.reason,
    });
    await this.xpTransactionRepo.save(xpTx);

    // Create Audit Log record
    const auditLog = this.auditRepo.create({
      adminId,
      action: 'MANUAL_XP_ADJUSTMENT',
      target: `User: ${userId}`,
      details: JSON.stringify({ amount: dto.amount, reason: dto.reason }),
      ipAddress: '127.0.0.1',
    });
    await this.auditRepo.save(auditLog);

    return {
      status: 'success',
      message: `Successfully adjusted user XP by ${dto.amount}`,
      data: { userId, adjustedAmount: dto.amount, reason: dto.reason },
    };
  }

  async adjustUserCoins(userId: string, dto: ManualAdjustmentDto, adminId: string, adminEmail: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Create Coin transaction record
    const coinTx = this.coinTransactionRepo.create({
      userId,
      amount: dto.amount,
      type: dto.amount >= 0 ? 'ADMIN_GRANT' : 'ADMIN_DEDUCT',
      source: 'ADMIN_MANUAL_ADJUSTMENT',
      description: dto.reason,
    });
    await this.coinTransactionRepo.save(coinTx);

    // Create Audit Log record
    const auditLog = this.auditRepo.create({
      adminId,
      action: 'MANUAL_COIN_ADJUSTMENT',
      target: `User: ${userId}`,
      details: JSON.stringify({ amount: dto.amount, reason: dto.reason }),
      ipAddress: '127.0.0.1',
    });
    await this.auditRepo.save(auditLog);

    return {
      status: 'success',
      message: `Successfully adjusted user coins by ${dto.amount}`,
      data: { userId, adjustedAmount: dto.amount, reason: dto.reason },
    };
  }
}