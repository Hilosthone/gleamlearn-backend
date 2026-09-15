// src/tests/entities/test.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('tests')
export class Test {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  courseId: string;

  @Column({ type: 'jsonb', default: [] })
  questions: any[];

  @Column({ type: 'int', default: 60 }) // Duration in minutes
  durationMinutes: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}