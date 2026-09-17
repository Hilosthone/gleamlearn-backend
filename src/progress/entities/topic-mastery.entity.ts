// src/progress/entities/topic-mastery.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('topic_masteries')
export class TopicMastery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  courseId: string;

  @Column()
  topicId: string;

  @Column({ type: 'float', default: 0 })
  masteryScore: number; // e.g., 88.0%

  @Column({ default: 'Beginner' })
  masteryLevel: string; // 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}