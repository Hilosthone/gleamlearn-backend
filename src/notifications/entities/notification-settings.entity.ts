// src/notifications/entities/notification-settings.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('notification_settings')
export class NotificationSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  userId: string;

  @Column({ default: true })
  emailAlerts: boolean;

  @Column({ default: true })
  pushNotifications: boolean;

  @Column({ default: true })
  aiTutorReminders: boolean;

  @Column({ default: false })
  marketingEmails: boolean;

  @UpdateDateColumn()
  updatedAt: Date;
}