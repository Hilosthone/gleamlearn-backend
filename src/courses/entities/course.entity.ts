// src/courses/entities/course.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import type { Department } from '../../academic/entities/department.entity.js';
import type { Topic } from './topic.entity.js';
import type { Enrollment } from './enrollment.entity.js';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar' })
  track: string; // 'Secondary' | 'University'

  @Column({ type: 'varchar', nullable: true })
  level: string; // e.g., 'SS 2' or '300 Level'

  @Column({ type: 'varchar', nullable: true })
  departmentId: string;

  @ManyToOne('Department', { nullable: true, onDelete: 'SET NULL' })
  department: Department;

  @OneToMany('Topic', (topic: Topic) => topic.course, { cascade: true })
  topics: Topic[];

  @OneToMany('Enrollment', (enrollment: Enrollment) => enrollment.course, { cascade: true })
  enrollments: Enrollment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}