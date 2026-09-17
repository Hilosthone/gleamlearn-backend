// src/exam-prep/entities/exam-prep.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('exam_preps')
export class ExamPrep {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  examinationId: string;

  @Column()
  targetSubject: string;

  @Column({ type: 'date', nullable: true })
  targetExamDate: Date;

  @Column({ type: 'jsonb', default: {} })
  studyPlan: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}