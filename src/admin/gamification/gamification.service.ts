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
    const [totals] = await this.xpTransactionRepo.query(
      `SELECT COALESCE(SUM(amount), 0)::bigint AS total, COUNT(DISTINCT "userId")::int AS earners FROM "xp_transactions"`,
    );
    const [top] = await this.xpTransactionRepo.query(
      `SELECT t."userId", u.email, SUM(t.amount)::bigint AS xp FROM "xp_transactions" t JOIN "users" u ON u.id = t."userId"
       GROUP BY t."userId", u.email ORDER BY xp DESC LIMIT 1`,
    );
    const total = Number(totals?.total) || 0;
    const earners = Number(totals?.earners) || 0;
    return {
      status: 'success',
      data: {
        totalXpGenerated: total,
        learnersWithXp: earners,
        averageXpPerEarner: earners ? Math.round(total / earners) : null,
        topXpEarner: top ? { userId: top.userId, email: top.email, xp: Number(top.xp) } : null,
      },
    };
  }

  async getCoinsOverview() {
    const [c] = await this.coinTransactionRepo.query(
      `SELECT COALESCE(SUM(amount) FILTER (WHERE amount > 0), 0)::bigint AS earned,
              COALESCE(-SUM(amount) FILTER (WHERE amount < 0), 0)::bigint AS spent
       FROM "coin_transactions"`,
    );
    const earned = Number(c?.earned) || 0;
    const spent = Number(c?.spent) || 0;
    return { status: 'success', data: { totalCoinsEarned: earned, totalCoinsSpent: spent, totalCoinsCirculating: earned - spent } };
  }

  async getStreaksOverview() {
    // a streak is active when the learner checked in today or yesterday (days follow Nigerian time, as for learners)
    const [s] = await this.streakRepo.query(
      `SELECT COUNT(*) FILTER (WHERE "currentStreak" > 0 AND "lastCheckInDate" >= (now() AT TIME ZONE 'Africa/Lagos')::date - 1)::int AS active,
              COALESCE(MAX("currentStreak") FILTER (WHERE "lastCheckInDate" >= (now() AT TIME ZONE 'Africa/Lagos')::date - 1), 0)::int AS longest_active,
              AVG("currentStreak") FILTER (WHERE "currentStreak" > 0 AND "lastCheckInDate" >= (now() AT TIME ZONE 'Africa/Lagos')::date - 1) AS avg_active,
              COALESCE(MAX("longestStreak"), 0)::int AS longest_ever
       FROM "user_streaks"`,
    );
    const active = Number(s?.active) || 0;
    return {
      status: 'success',
      data: {
        activeStreaksCount: active,
        longestActiveStreak: active ? Number(s.longest_active) : null,
        averageActiveStreakDays: active && s.avg_active != null ? Math.round(Number(s.avg_active) * 10) / 10 : null,
        longestStreakEver: Number(s?.longest_ever) || 0,
      },
    };
  }

  async getLeaderboards(query: GamificationQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const rows = await this.xpTransactionRepo.query(
      `SELECT x."userId", u.email, x.xp, COALESCE(c.coins, 0)::bigint AS coins, COALESCE(s."currentStreak", 0) AS streak
       FROM (SELECT "userId", SUM(amount)::bigint AS xp FROM "xp_transactions" GROUP BY "userId") x
       JOIN "users" u ON u.id = x."userId"
       LEFT JOIN (SELECT user_id, SUM(amount) AS coins FROM "coin_transactions" GROUP BY user_id) c ON c.user_id = x."userId"
       LEFT JOIN "user_streaks" s ON s."userId" = x."userId"::text
       ORDER BY x.xp DESC, u.email ASC LIMIT $1 OFFSET $2`,
      [limit, (page - 1) * limit],
    );
    const [count] = await this.xpTransactionRepo.query(`SELECT COUNT(DISTINCT "userId")::int AS n FROM "xp_transactions"`);
    const total = Number(count?.n) || 0;
    return {
      status: 'success',
      data: {
        leaderboard: rows.map((r: any, i: number) => ({ rank: (page - 1) * limit + i + 1, userId: r.userId, email: r.email, xp: Number(r.xp), coins: Number(r.coins), streak: Number(r.streak) })),
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
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
      category: 'GAMIFICATION',
      action: 'MANUAL_XP_ADJUSTMENT',
      target: `User: ${userId}`,
      details: JSON.stringify({ amount: dto.amount, reason: dto.reason }),
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
      category: 'GAMIFICATION',
      action: 'MANUAL_COIN_ADJUSTMENT',
      target: `User: ${userId}`,
      details: JSON.stringify({ amount: dto.amount, reason: dto.reason }),
    });
    await this.auditRepo.save(auditLog);

    return {
      status: 'success',
      message: `Successfully adjusted user coins by ${dto.amount}`,
      data: { userId, adjustedAmount: dto.amount, reason: dto.reason },
    };
  }
}