// src/streak/entities/streak-history.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('streak_history')
export class StreakHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'date' })
  checkInDate: string; // YYYY-MM-DD

  @Column({ default: 'manual_check_in' })
  activitySource: string; // e.g., 'manual_check_in', 'study_session', 'recovered'

  @CreateDateColumn()
  createdAt: Date;
}