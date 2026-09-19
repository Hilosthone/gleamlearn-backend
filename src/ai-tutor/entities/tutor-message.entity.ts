// src/ai-tutor/entities/tutor-message.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import type { TutorSession } from './tutor-session.entity.js'; // Use type-only import to break circular dependency

@Entity('tutor_messages')
export class TutorMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Pass a factory function returning the class or string name to ManyToOne, 
  // and type the property safely using the type-only import.
  @ManyToOne('TutorSession', (session: any) => session.messages, { onDelete: 'CASCADE' })
  session: TutorSession;

  @Column()
  sessionId: string;

  @Column({ type: 'text' })
  sender: string; // 'user' | 'tutor'

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn()
  createdAt: Date;
}