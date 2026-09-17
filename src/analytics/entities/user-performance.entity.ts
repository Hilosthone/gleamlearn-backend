// src/analytics/entities/user-performance.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('user_performances')
export class UserPerformance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  courseId: string;

  @Column()
  assessmentType: string; // 'quiz' | 'test' | 'exam'

  @Column()
  assessmentId: string;

  @Column({ type: 'float' })
  score: number; // Percentage score (e.g., 85.5)

  @Column({ type: 'jsonb', default: [] })
  topicsCovered: string[];

  @Column({ type: 'int', default: 0 })
  timeSpentSeconds: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}