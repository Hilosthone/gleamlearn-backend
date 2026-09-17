// src/exam-prep/entities/past-question.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('past_questions')
export class PastQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  examinationId: string; // Links to Examination

  @Column()
  subject: string;

  @Column({ type: 'int' })
  year: number;

  @Column()
  topic: string;

  @Column({ type: 'text' })
  questionText: string;

  @Column({ type: 'jsonb', default: [] })
  options: string[];

  @Column()
  correctAnswer: string;

  @Column({ type: 'text', nullable: true })
  explanation: string;

  @CreateDateColumn()
  createdAt: Date;
}