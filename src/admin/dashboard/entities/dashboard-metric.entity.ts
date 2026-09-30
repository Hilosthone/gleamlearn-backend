// src/admin/dashboard/entities/dashboard-metric.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('admin_dashboard_metrics')
export class DashboardMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', default: 0 })
  totalUsers: number;

  @Column({ type: 'int', default: 0 })
  activeUsers: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
  totalRevenue: number;

  @CreateDateColumn()
  recordedAt: Date;
}