import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

/**
 * One recovered calendar day (database/migrations/20261102090000_streak_recovery_and_engagement_rewards.sql).
 * The monthly allowance is counted from these rows; the unique key stops a day being recovered twice.
 */
@Entity('streak_recoveries')
@Unique('UQ_streak_recoveries_day', ['userId', 'missedDate'])
@Index('IDX_streak_recoveries_month', ['userId', 'monthKey'])
export class StreakRecovery {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'user_id', type: 'varchar' }) userId: string;
  @Column({ name: 'missed_date', type: 'date' }) missedDate: string;
  @Column({ name: 'recovered_on', type: 'date' }) recoveredOn: string;
  @Column({ name: 'month_key', type: 'char', length: 7 }) monthKey: string;
  @Column({ name: 'streak_before', type: 'int', default: 0 }) streakBefore: number;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
}
