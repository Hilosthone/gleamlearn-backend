// // src/exam-prep/entities/past-question.entity.ts
// import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// @Entity('past_questions')
// export class PastQuestion {
//   @PrimaryGeneratedColumn('uuid')
//   id: string;

//   @Column()
//   examinationId: string; // Links to Examination

//   @Column()
//   subject: string;

//   @Column({ type: 'int' })
//   year: number;

//   @Column()
//   topic: string;

//   @Column({ type: 'text' })
//   questionText: string;

//   @Column({ type: 'jsonb', default: [] })
//   options: string[];

//   @Column()
//   correctAnswer: string;

//   @Column({ type: 'text', nullable: true })
//   explanation: string;

//   @CreateDateColumn()
//   createdAt: Date;
// }
// src/exam-prep/entities/past-question.entity.ts
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('past_questions')
export class PastQuestion {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'jsonb', nullable: true })
  options: Record<string, string>;

  @Column({ type: 'varchar', length: 10, nullable: true })
  correctAnswer: string;

  @Column({ type: 'varchar', length: 50 })
  examType: string;

  @Column({ type: 'varchar', length: 100 })
  subject: string;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'varchar', length: 50, default: 'NG' })
  country: string;

  @Column({ type: 'int', nullable: true })
  questionNumber: number;

  @Column({ type: 'boolean', default: false })
  hasPassage: boolean;

  @Column({ type: 'varchar', length: 150, nullable: true })
  topic: string;

  @Column({ type: 'text', nullable: true })
  explanation: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}