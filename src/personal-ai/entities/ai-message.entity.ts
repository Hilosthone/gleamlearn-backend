// src/personal-ai/entities/ai-message.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

@Entity('ai_messages')
export class AiMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  conversationId: string;

  // Use string entity target name to prevent ES module circular initialization race conditions
  @ManyToOne('AiConversation', 'messages', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation: any;

  @Column({ type: 'enum', enum: ['user', 'ai', 'system'] })
  sender: string;

  @Column('text')
  content: string;

  @CreateDateColumn()
  createdAt: Date;
}