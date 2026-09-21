import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('push_tokens')
export class PushToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ unique: true })
  token: string;

  @Column({ default: 'fcm' }) // e.g., 'fcm' or 'expo'
  provider: string;

  @CreateDateColumn()
  createdAt: Date;
}