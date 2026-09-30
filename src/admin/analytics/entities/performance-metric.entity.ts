// src/admin/analytics/entities/performance-metric.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('admin_performance_metrics')
export class PerformanceMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  category: string; // OVERVIEW, STUDENTS, COURSES, SUBJECTS, EXAMS, QUIZZES, TESTS, LEARNING, RETENTION, STREAKS

  @Column({ type: 'jsonb', nullable: true })
  metricsData: any; // Flexible JSON payload for rich analytics data snapshots

  @CreateDateColumn()
  recordedAt: Date;
}