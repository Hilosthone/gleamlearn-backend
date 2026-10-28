import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * A learner's calendar event (database/migrations/20261028230000_calendar_events.sql). Column names follow the old
 * Prisma model (snake_case), which never had a table: the calendar now uses TypeORM like the rest of the backend.
 * Ownership: every query filters on user_id from the signed-in token.
 */
@Entity('calendar_events')
@Index('IDX_calendar_events_user_start', ['userId', 'startTime'])
export class CalendarEvent {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId: string;
  @Column({ type: 'varchar', length: 200 }) title: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ name: 'start_time', type: 'timestamptz' }) startTime: Date;
  @Column({ name: 'end_time', type: 'timestamptz' }) endTime: Date;
  @Column({ name: 'is_all_day', type: 'boolean', default: false }) isAllDay: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
