// src/admin/questions/entities/admin-question.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('admin_questions')
export class AdminQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  questionText: string;

  @Column({ type: 'jsonb', nullable: true })
  options: string[]; // e.g. ['A. Option 1', 'B. Option 2', ...]

  @Column({ type: 'varchar', length: 255 })
  correctAnswer: string;

  @Column({ type: 'text', nullable: true })
  explanation?: string;

  @Column({ type: 'varchar', length: 100 })
  subjectOrCategory: string;

  @Column({ type: 'varchar', length: 30, default: 'PENDING' })
  status: string; // PENDING, APPROVED, REJECTED

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}