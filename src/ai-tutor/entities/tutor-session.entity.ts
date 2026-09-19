// src/ai-tutor/entities/tutor-session.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { TutorMessage } from './tutor-message.entity.js';

@Entity('tutor_sessions')
export class TutorSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ default: 'General Classroom Session' })
  title: string;

  @Column({ default: 'active' })
  status: string; // 'active' | 'ended'

  @OneToMany(() => TutorMessage, (message) => message.session, { cascade: true })
  messages: TutorMessage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}