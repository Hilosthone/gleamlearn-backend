// import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

// @Entity('admin_notifications')
// export class AdminNotification {
//   @PrimaryGeneratedColumn('uuid')
//   id: string;

//   @Column({ type: 'varchar', length: 150 })
//   title: string;

//   @Column({ type: 'text' })
//   message: string;

//   @Column({ name: 'target_type', type: 'varchar', length: 50 })
//   targetType: string; // EVERYONE, SECONDARY_STUDENTS, UNIVERSITY_STUDENTS, SPECIFIC_INSTITUTION, SPECIFIC_DEPARTMENT, PREMIUM_USERS, SINGLE_USER

//   @Column({ name: 'target_id', type: 'varchar', length: 100, nullable: true })
//   targetId?: string;

//   @Column({ name: 'sender_admin_id', type: 'uuid' })
//   senderAdminId: string;

//   @CreateDateColumn({ name: 'created_at' })
//   createdAt: Date;
// }

// src/admin/notifications/entities/admin-notification.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('admin_notifications')
export class AdminNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'target_type', type: 'varchar', length: 50 })
  targetType: string;

  @Column({ name: 'target_id', type: 'varchar', length: 100, nullable: true })
  targetId?: string | null; // <-- Updated to allow null

  @Column({ name: 'sender_admin_id', type: 'uuid' })
  senderAdminId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}