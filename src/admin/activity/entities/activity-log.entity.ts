// // src/admin/activity/entities/activity-log.entity.ts
// import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

// @Entity('admin_activity_logs')
// export class ActivityLog {
//   @PrimaryGeneratedColumn('uuid')
//   id: string;

//   @Column({ type: 'uuid', nullable: true })
//   userId?: string;

//   @Column({ type: 'varchar', length: 50 })
//   category: string; // USERS, LEARNING, ASSESSMENTS, AI, PAYMENTS, SYSTEM

//   @Column({ type: 'varchar', length: 100 })
//   action: string; // e.g., 'LOGIN', 'COURSE_CREATE', 'PDF_UPLOAD', 'AI_SESSION', etc.

//   @Column({ type: 'text', nullable: true })
//   details?: string;

//   @CreateDateColumn()
//   timestamp: Date;
// }



// src/admin/activity/entities/activity-log.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('admin_activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'admin_id', type: 'uuid', nullable: true })
  adminId?: string; // Tracks which admin performed the action

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category: string; // USERS, LEARNING, ASSESSMENTS, AI, PAYMENTS, SYSTEM

  @Column({ type: 'varchar', length: 100 })
  action: string; // e.g., 'MANUAL_XP_ADJUSTMENT', 'MANUAL_COIN_ADJUSTMENT'

  @Column({ type: 'varchar', length: 255, nullable: true })
  target?: string; // e.g., 'User: <uuid>'

  @Column({ type: 'text', nullable: true })
  details?: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @CreateDateColumn()
  timestamp: Date;
}