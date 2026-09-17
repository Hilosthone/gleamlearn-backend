// src/goals/entities/study-goal.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('study_goals')
export class StudyGoal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: 'general' })
  goalType: string; // e.g., 'daily_hours', 'course_completion', 'topic_mastery'

  @Column({ type: 'float', default: 100 })
  targetValue: number; // e.g., 10 hours or 100% completion

  @Column({ type: 'float', default: 0 })
  currentValue: number; // current progress value

  @Column({ type: 'date', nullable: true })
  targetDate: string; // deadline date

  @Column({ default: false })
  isCompleted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}