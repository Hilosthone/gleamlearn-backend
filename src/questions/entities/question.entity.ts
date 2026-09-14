// src/questions/entities/question.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true })
  courseId: string;

  @Column({ type: 'varchar', nullable: true })
  subject: string;

  @Column({ type: 'varchar', nullable: true })
  topic: string;

  @Column({ type: 'varchar', nullable: true })
  difficulty: string; // e.g., 'easy', 'medium', 'hard'

  @Column({ type: 'varchar', nullable: true })
  type: string; // e.g., 'objective', 'theory', 'true_false'

  @Column({ type: 'varchar', nullable: true })
  examination: string; // e.g., 'JAMB', 'WAEC', 'University'

  @Column({ type: 'int', nullable: true })
  year: number;

  @Column({ type: 'varchar', nullable: true })
  source: string;

  @Column({ type: 'text' })
  questionText: string;

  @Column({ type: 'jsonb', nullable: true })
  options: string[]; // For objective/multiple choice questions

  @Column({ type: 'text' })
  correctAnswer: string;

  @Column({ type: 'text', nullable: true })
  explanation: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}