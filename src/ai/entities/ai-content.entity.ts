// src/ai/entities/ai-content.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('ai_generated_contents')
export class AiContentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  fileId: string; // References the uploaded file ID from Batch 6

  @Column({ type: 'varchar' })
  contentType: string; // 'ANALYSIS' | 'NOTES' | 'SUMMARY' | 'FLASHCARDS' | 'QUESTIONS' | 'QUIZ' | 'TEST' | 'EXAM' | 'COURSE'

  @Column({ type: 'jsonb', nullable: true })
  payload: any; // Stores the raw or structured JSON output returned by the FastAPI AI service

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}