import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('system_settings')
export class SystemSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'jsonb', default: { hardQuiz: 50, mediumQuiz: 30, easyQuiz: 15 } })
  xpRewards: Record<string, number>;

  @Column({ type: 'jsonb', default: { hardQuiz: 20, courseCompletion: 100, dailyLogin: 5 } })
  coinRewards: Record<string, number>;

  @Column({ name: 'streak_recovery_limit', type: 'int', default: 3 })
  streakRecoveryLimit: number;

  @Column({ name: 'free_ai_limit', type: 'int', default: 10 })
  freeAiLimit: number;

  @Column({ name: 'premium_ai_limit', type: 'int', default: 100 })
  premiumAiLimit: number;

  @Column({ name: 'max_upload_size_mb', type: 'int', default: 25 })
  maxUploadSizeMb: number;

  @Column({ name: 'supported_file_types', type: 'simple-array', default: ['pdf', 'docx', 'png', 'jpg', 'mp4'] })
  supportedFileTypes: string[];

  @Column({ type: 'jsonb', default: { emailEnabled: true, pushEnabled: true, smsEnabled: false } })
  notificationSettings: Record<string, boolean>;

  @Column({ name: 'maintenance_mode', type: 'boolean', default: false })
  maintenanceMode: boolean;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}