// // src/progress/entities/user-progress.entity.ts
// import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// @Entity('user_progress')
// export class UserProgress {
//   @PrimaryGeneratedColumn('uuid')
//   id: string;

//   @Column()
//   userId: string;

//   @Column({ nullable: true })
//   courseId: string;

//   @Column({ nullable: true })
//   topicId: string;

//   @Column({ type: 'float', default: 0 })
//   completionPercentage: number; // e.g., 75.5%

//   @Column({ default: false })
//   isCompleted: boolean;

//   @Column({ nullable: true })
//   lastAccessedActivity: string;

//   @CreateDateColumn()
//   createdAt: Date;

//   @UpdateDateColumn()
//   updatedAt: Date;
// }


// src/progress/entities/user-progress.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('user_progress')
export class UserProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  courseId: string;

  @Column({ nullable: true }) // <-- Ensure nullable is set here
  topicId: string;

  @Column({ type: 'float', default: 0 })
  completionPercentage: number;

  @Column({ default: false })
  isCompleted: boolean;

  @Column({ nullable: true })
  lastAccessedActivity: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}