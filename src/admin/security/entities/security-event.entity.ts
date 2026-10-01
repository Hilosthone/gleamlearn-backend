import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('security_events')
export class SecurityEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string;

  @Column({ name: 'event_type', type: 'varchar', length: 100 })
  eventType: string; // e.g., 'MULTIPLE_FAILED_LOGINS', 'UNUSUAL_IP_ACCESS', 'RATE_LIMIT_EXCEEDED', 'ABUSE_FLAGGED'

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 20, default: 'MEDIUM' })
  severity: string; // 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}