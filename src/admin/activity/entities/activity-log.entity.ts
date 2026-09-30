// src/admin/activity/entities/activity-log.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('admin_activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @Column({ type: 'varchar', length: 50 })
  category: string; // USERS, LEARNING, ASSESSMENTS, AI, PAYMENTS, SYSTEM

  @Column({ type: 'varchar', length: 100 })
  action: string; // e.g., 'LOGIN', 'COURSE_CREATE', 'PDF_UPLOAD', 'AI_SESSION', etc.

  @Column({ type: 'text', nullable: true })
  details?: string;

  @CreateDateColumn()
  timestamp: Date;
}