import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

/**
 * Engagement rewards (database/migrations/20261102090000_streak_recovery_and_engagement_rewards.sql).
 *
 * EngagementReward is the idempotency record of one reward ("daily_visit" for a day, "active_time" for a day and
 * block). The XP and coins themselves live in the existing xp_transactions / coin_transactions ledgers, written in
 * the same transaction only when this row is inserted.
 */
@Entity('engagement_rewards')
@Unique('UQ_engagement_rewards_period', ['userId', 'kind', 'periodKey'])
@Index('IDX_engagement_rewards_user', ['userId', 'createdAt'])
export class EngagementReward {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId: string;
  @Column({ type: 'varchar', length: 20 }) kind: 'daily_visit' | 'active_time';
  @Column({ name: 'period_key', type: 'varchar', length: 20 }) periodKey: string;
  @Column({ type: 'int' }) xp: number;
  @Column({ type: 'int' }) coins: number;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
}

/** Active time credited from heartbeats, per learner and day. */
@Entity('engagement_days')
export class EngagementDay {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' }) userId: string;
  @PrimaryColumn({ type: 'date' }) day: string;
  @Column({ name: 'active_seconds', type: 'int', default: 0 }) activeSeconds: number;
  @Column({ name: 'rewarded_blocks', type: 'int', default: 0 }) rewardedBlocks: number;
  @Column({ name: 'last_heartbeat_at', type: 'timestamptz', nullable: true }) lastHeartbeatAt: Date | null;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
