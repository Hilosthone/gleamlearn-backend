// import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// @Entity('users')
// export class UserEntity {
//   @PrimaryGeneratedColumn('uuid')
//   id: string;

//   @Column({ type: 'varchar', unique: true, length: 255 })
//   email: string;

//   @Column({ type: 'varchar', unique: true, length: 100 })
//   username: string;

//   @Column({ type: 'varchar' })
//   passwordHash: string;

//   @Column({ type: 'varchar', length: 150 })
//   fullName: string;

//   @Column({ type: 'varchar', nullable: true })
//   dateOfBirth: string;

//   @Column({ type: 'varchar', length: 100, nullable: true })
//   country: string;

//   // Education & Academic Profile Fields
//   @Column({ type: 'varchar', nullable: true })
//   educationType: string; // e.g., 'secondary' or 'university'

//   @Column({ type: 'varchar', nullable: true })
//   secondarySchool: string;

//   @Column({ type: 'varchar', nullable: true })
//   university: string;

//   @Column({ type: 'varchar', nullable: true })
//   institution: string;

//   @Column({ type: 'varchar', nullable: true })
//   department: string;

//   @Column({ type: 'varchar', nullable: true })
//   levelOrClass: string; // e.g., 'SS2', '200L'

//   // Preferences & Goals
//   @Column({ type: 'varchar', nullable: true })
//   preferredLearningPace: string;

//   @Column({ type: 'varchar', nullable: true })
//   preferredStudyTime: string;

//   @Column({ type: 'text', nullable: true })
//   academicGoals: string;

//   // Account Status & Roles
//   @Column({ type: 'boolean', default: false })
//   isEmailVerified: boolean;

//   @Column({ type: 'varchar', default: 'student' })
//   role: string;

//   @CreateDateColumn()
//   createdAt: Date;

//   @UpdateDateColumn()
//   updatedAt: Date;
// }



// src/auth/entities/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true, length: 255 })
  email: string;

  @Column({ type: 'varchar', unique: true, length: 100 })
  username: string;

  @Column({ type: 'varchar' })
  passwordHash: string;

  @Column({ type: 'varchar', length: 150 })
  fullName: string;

  @Column({ type: 'varchar', nullable: true })
  dateOfBirth: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string;

  // Education & Academic Profile Fields
  @Column({ type: 'varchar', nullable: true })
  educationType: string; // e.g., 'secondary' or 'university'

  @Column({ type: 'varchar', nullable: true })
  secondarySchool: string;

  @Column({ type: 'varchar', nullable: true })
  university: string;

  @Column({ type: 'varchar', nullable: true })
  institution: string;

  @Column({ type: 'varchar', nullable: true })
  department: string;

  @Column({ type: 'varchar', nullable: true })
  levelOrClass: string; // e.g., 'SS2', '200L'

  // Preferences & Goals
  @Column({ type: 'varchar', nullable: true })
  preferredLearningPace: string;

  @Column({ type: 'varchar', nullable: true })
  preferredStudyTime: string;

  @Column({ type: 'text', nullable: true })
  academicGoals: string;

  // Account Status & Roles
  @Column({ type: 'boolean', default: false })
  isEmailVerified: boolean;

  @Column({ type: 'boolean', default: false })
  isFrozen: boolean;

  @Column({ type: 'varchar', default: 'student' })
  role: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date;
}