// src/xp/entities/xp-transaction.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity.js';

@Entity('xp_transactions')
export class XpTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'int' })
  amount: number; // e.g., +50 XP for quiz completion

  @Column({ type: 'varchar' })
  source: string; // e.g., 'QUIZ_COMPLETED', 'COURSE_FINISHED', 'DAILY_STREAK'

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;
}