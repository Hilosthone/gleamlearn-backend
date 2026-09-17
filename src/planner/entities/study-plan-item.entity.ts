// src/planner/entities/study-plan-item.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('study_plan_items')
export class StudyPlanItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'date' })
  scheduledDate: string; // YYYY-MM-DD

  @Column({ nullable: true })
  startTime: string; // e.g., '09:00 AM'

  @Column({ nullable: true })
  endTime: string; // e.g., '10:30 AM'

  @Column({ default: 'study' })
  activityType: string; // 'study', 'quiz_practice', 'revision', 'exam_prep'

  @Column({ default: false })
  isCompleted: boolean;

  @Column({ default: false })
  isSkipped: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any; // Additional course or topic mapping

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}