// src/courses/entities/enrollment.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Unique } from 'typeorm';
import type { User } from '../../auth/entities/user.entity.js';
import type { Course } from './course.entity.js';

@Entity('enrollments')
@Unique(['userId', 'courseId'])
export class Enrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  user: User;

  @Column()
  courseId: string;

  @ManyToOne('Course', (course: Course) => course.enrollments, { onDelete: 'CASCADE' })
  course: Course;

  @Column({ type: 'float', default: 0 })
  progressPercentage: number;

  @CreateDateColumn()
  enrolledAt: Date;
}