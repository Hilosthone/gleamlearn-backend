// src/admin/users/entities/admin-user-action.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('admin_user_actions')
export class AdminUserAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  targetUserId: string; // The user affected by the action

  @Column({ type: 'varchar', length: 100 })
  actionType: string; // e.g., 'SUSPEND', 'FREEZE', 'RESET_PASSWORD', 'VERIFY'

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @CreateDateColumn()
  performedAt: Date;
}