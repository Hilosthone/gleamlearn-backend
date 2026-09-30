// src/admin/reports/entities/admin-report.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('admin_reports')
export class AdminReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  reporterId?: string;

  @Column({ type: 'varchar', length: 50 })
  reportedItemType: string; // e.g., 'COURSE', 'USER', 'QUESTION', 'COMMENT'

  @Column({ type: 'varchar', length: 255 })
  reportedItemId: string;

  @Column({ type: 'varchar', length: 255 })
  reason: string; // e.g., 'Spam', 'Inappropriate Content', 'Copyright Violation'

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 30, default: 'PENDING' })
  status: string; // PENDING, RESOLVED, REJECTED

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}