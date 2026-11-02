import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { StreakService } from '../streak/streak.service.js';
import { dayInZone } from '../streak/streak-dates.js';
import { XpService } from '../xp/xp.service.js';
import { CoinsService } from '../coins/coins.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { EngagementReward } from './entities.js';
import {
  ACTIVE_BLOCK_COINS,
  ACTIVE_BLOCK_XP,
  DAILY_VISIT_COINS,
  DAILY_VISIT_XP,
  MAX_ACTIVE_BLOCKS_PER_DAY,
  POLICY,
  blocksFor,
  clampDaySeconds,
  creditFor,
  secondsToNextBlock,
} from './engagement-policy.js';

export interface GrantedReward {
  kind: 'daily_visit' | 'active_time';
  periodKey: string;
  xp: number;
  coins: number;
  message: string;
}

/**
 * Daily-visit and active-time rewards (engagement-policy.ts).
 *
 * Every reward is granted through grant(): one transaction inserts the engagement_rewards row (its unique key on
 * learner + kind + period is the idempotency guard) and, only if that row was new, writes the XP and coins to the
 * existing xp_transactions / coin_transactions ledgers through XpService / CoinsService. There is no other balance.
 * Notifications are created after the transaction commits, so a learner is never told about a reward that was
 * not recorded. The client never sends amounts.
 */
@Injectable()
export class EngagementService {
  private readonly logger = new Logger('Engagement');

  constructor(
    @InjectRepository(EngagementReward) private readonly rewards: Repository<EngagementReward>,
    private readonly streaks: StreakService,
    private readonly xp: XpService,
    private readonly coins: CoinsService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Inside `m`: records the reward once and credits XP and coins; null when it was already granted. */
  private async grant(m: EntityManager, userId: string, kind: GrantedReward['kind'], periodKey: string, xp: number, coins: number, message: string): Promise<GrantedReward | null> {
    const inserted = (await m.query(
      `INSERT INTO "engagement_rewards" ("user_id", "kind", "period_key", "xp", "coins") VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT ON CONSTRAINT "UQ_engagement_rewards_period" DO NOTHING RETURNING "id"`,
      [userId, kind, periodKey, xp, coins],
    )) as { id: string }[];
    if (!inserted.length) return null;
    const ref = `[engagement:${kind}:${periodKey}]`;
    const source = kind === 'daily_visit' ? 'DAILY_VISIT' : 'ACTIVE_TIME';
    await this.xp.awardXp(userId, xp, source, `${message} ${ref}`, m);
    await this.coins.awardCoins(userId, coins, source, `${message} ${ref}`, m);
    return { kind, periodKey, xp, coins, message };
  }

  /** In-app notification after a committed reward; a failure here never undoes or fails the reward. */
  private async notify(userId: string, title: string, message: string, type = 'reward') {
    try {
      await this.notifications.createAndPushNotification(userId, title, message, type);
    } catch (err) {
      this.logger.warn(`notification not created for ${userId}: ${(err as Error).message}`);
    }
  }

  /**
   * The first signed-in visit of the day (POST /engagement/daily). Idempotent: any number of calls, tabs or devices
   * count the day once, credit the visit reward once and send its notifications once.
   */
  async dailyVisit(userId: string, now = new Date()) {
    const today = dayInZone(now);
    const streak = await this.streaks.recordActivity(userId, 'daily_visit', now);
    const message = `Welcome back! You've earned ${DAILY_VISIT_XP} XP and ${DAILY_VISIT_COINS} coins for checking in today.`;
    const reward = await this.rewards.manager.transaction((m) => this.grant(m, userId, 'daily_visit', today, DAILY_VISIT_XP, DAILY_VISIT_COINS, message));
    const status = await this.streaks.getStreakStatus(userId, now);

    if (reward) {
      await this.notify(userId, 'Daily check-in reward', message);
      const r = status.recovery;
      if (r.missedDays.length) {
        await this.notify(
          userId,
          'You missed your streak',
          r.recoverable
            ? `You missed ${r.missedDays.length === 1 ? 'a day' : `${r.missedDays.length} days`}. You have ${r.remainingThisMonth} of ${r.monthlyAllowance} streak recoveries left this month — recover your ${r.brokenStreak}-day streak today on your dashboard.`
            : r.reason === 'allowance_exhausted'
              ? `You missed a day and have used all ${r.monthlyAllowance} streak recoveries this month, so your streak starts again today.`
              : `You missed ${r.missedDays.length} days, which is more than the ${r.remainingThisMonth} recoveries you have left this month, so your streak starts again today.`,
          'streak',
        );
      }
    }
    return {
      status: 'success',
      today,
      streakCounted: streak.counted,
      streak: status,
      reward: reward ? { granted: true, xp: reward.xp, coins: reward.coins, message } : { granted: false, xp: 0, coins: 0 },
      policy: POLICY,
    };
  }

  /**
   * A heartbeat (POST /engagement/heartbeat). `active` is false when the page is hidden or the learner has been idle:
   * the clock stops and the next active heartbeat starts a new session (nothing is credited for the pause).
   */
  async heartbeat(userId: string, active: boolean, now = new Date()) {
    const today = dayInZone(now);
    const granted = await this.rewards.manager.transaction(async (m) => {
      await m.query(`INSERT INTO "engagement_days" ("user_id", "day") VALUES ($1, $2) ON CONFLICT DO NOTHING`, [userId, today]);
      // the row lock serialises heartbeats from several tabs or devices: they share one clock
      const [row] = (await m.query(
        `SELECT "active_seconds", "rewarded_blocks", "last_heartbeat_at" FROM "engagement_days" WHERE "user_id" = $1 AND "day" = $2 FOR UPDATE`,
        [userId, today],
      )) as { active_seconds: number; rewarded_blocks: number; last_heartbeat_at: Date | null }[];
      const credit = active ? creditFor(row.last_heartbeat_at ? new Date(row.last_heartbeat_at) : null, now) : 0;
      const seconds = clampDaySeconds(Number(row.active_seconds) + credit);
      const blocks = blocksFor(seconds);
      const out: GrantedReward[] = [];
      for (let b = Number(row.rewarded_blocks) + 1; b <= blocks; b++) {
        const message = `Nice work! You've earned ${ACTIVE_BLOCK_XP} XP and ${ACTIVE_BLOCK_COINS} coins for spending another 10 minutes learning with GleamLearn.`;
        const g = await this.grant(m, userId, 'active_time', `${today}#${b}`, ACTIVE_BLOCK_XP, ACTIVE_BLOCK_COINS, message);
        if (g) out.push(g);
      }
      await m.query(
        `UPDATE "engagement_days" SET "active_seconds" = $3, "rewarded_blocks" = GREATEST("rewarded_blocks", $4), "last_heartbeat_at" = $5, "updated_at" = now()
         WHERE "user_id" = $1 AND "day" = $2`,
        [userId, today, seconds, blocks, active ? now : null],
      );
      return { out, seconds, blocks };
    });

    for (const g of granted.out) await this.notify(userId, 'Learning time reward', g.message);
    return {
      status: 'success',
      today,
      activeSecondsToday: granted.seconds,
      rewardedBlocksToday: granted.blocks,
      maxBlocksPerDay: MAX_ACTIVE_BLOCKS_PER_DAY,
      capReached: granted.blocks >= MAX_ACTIVE_BLOCKS_PER_DAY,
      nextRewardInSeconds: secondsToNextBlock(granted.seconds),
      rewards: granted.out.map((g) => ({ xp: g.xp, coins: g.coins, message: g.message })),
    };
  }

  /** Today's engagement (GET /engagement/today): visit reward, active time, rewards and the policy. */
  async today(userId: string, now = new Date()) {
    const today = dayInZone(now);
    const [day] = (await this.rewards.manager.query(`SELECT "active_seconds", "rewarded_blocks" FROM "engagement_days" WHERE "user_id" = $1 AND "day" = $2`, [userId, today])) as {
      active_seconds: number;
      rewarded_blocks: number;
    }[];
    const rewards = await this.rewards.find({ where: { userId }, order: { createdAt: 'DESC' }, take: 20 });
    const seconds = Number(day?.active_seconds ?? 0);
    return {
      status: 'success',
      today,
      dailyVisitRewarded: rewards.some((r) => r.kind === 'daily_visit' && r.periodKey === today),
      activeSecondsToday: seconds,
      rewardedBlocksToday: Number(day?.rewarded_blocks ?? 0),
      maxBlocksPerDay: MAX_ACTIVE_BLOCKS_PER_DAY,
      nextRewardInSeconds: secondsToNextBlock(seconds),
      recentRewards: rewards.map((r) => ({ kind: r.kind, period: r.periodKey, xp: r.xp, coins: r.coins, at: r.createdAt })),
      policy: POLICY,
    };
  }
}
