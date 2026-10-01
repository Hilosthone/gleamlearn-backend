// // // src/auth/entities/user.entity.ts
// // import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// // @Entity('users')
// // export class User {
// //   @PrimaryGeneratedColumn('uuid')
// //   id: string;

// //   @Column({ type: 'varchar' })
// //   fullName: string;

// //   @Column({ type: 'varchar', unique: true })
// //   username: string;

// //   @Column({ type: 'varchar', unique: true })
// //   email: string;

// //   @Column({ type: 'varchar' })
// //   passwordHash: string; // Updated from 'password' to match AuthService mapping

// //   @Column({ type: 'varchar', nullable: true })
// //   dateOfBirth: string;

// //   @Column({ type: 'varchar', nullable: true })
// //   country: string;

// //   // Education Track Switch
// //   @Column({ type: 'varchar', nullable: true })
// //   educationType: string; // 'Secondary' | 'University'

// //   // Secondary School Track
// //   @Column({ type: 'varchar', nullable: true })
// //   secondarySchool: string;

// //   @Column({ type: 'varchar', nullable: true })
// //   secondaryClass: string; // JSS 1 - SSS 3

// //   @Column({ type: 'varchar', nullable: true })
// //   secondaryStream: string; // Science, Art, Commercial

// //   // University Track
// //   @Column({ type: 'varchar', nullable: true })
// //   university: string;

// //   @Column({ type: 'varchar', nullable: true })
// //   faculty: string;

// //   @Column({ type: 'varchar', nullable: true })
// //   department: string;

// //   @Column({ type: 'varchar', nullable: true })
// //   courseOfStudy: string;

// //   @Column({ type: 'varchar', nullable: true })
// //   level: string; // 100 Level - 600 Level

// //   // Goals & Preferences
// //   @Column({ type: 'varchar', nullable: true })
// //   examAimOrGoals: string; // WAEC, JAMB, University Exams, etc.

// //   @Column({ type: 'varchar', nullable: true })
// //   preferredStudyTime: string;

// //   @Column({ default: false })
// //   isEmailVerified: boolean;

// //   @Column({ type: 'varchar', nullable: true })
// //   refreshToken: string;

// //   @CreateDateColumn()
// //   createdAt: Date;

// //   @UpdateDateColumn()
// //   updatedAt: Date;
// // }


// import {
//   Entity,
//   PrimaryGeneratedColumn,
//   Column,
//   CreateDateColumn,
//   UpdateDateColumn,
// } from 'typeorm';

// @Entity('users')
// export class User {
//   @PrimaryGeneratedColumn('uuid')
//   id: string;

//   @Column({ type: 'varchar' })
//   fullName: string;

//   @Column({ type: 'varchar', unique: true })
//   username: string;

//   @Column({ type: 'varchar', unique: true })
//   email: string;

//   @Column({ type: 'varchar' })
//   passwordHash: string;

//   @Column({ type: 'varchar', nullable: true })
//   dateOfBirth: string;

//   @Column({ type: 'varchar', nullable: true })
//   country: string;

//   // Education Track Switch
//   @Column({ type: 'varchar', nullable: true })
//   educationType: string; // 'Secondary' | 'University'

//   // Secondary School Track
//   @Column({ type: 'varchar', nullable: true })
//   secondarySchool: string;

//   @Column({ type: 'varchar', nullable: true })
//   secondaryClass: string;

//   @Column({ type: 'varchar', nullable: true })
//   secondaryStream: string;

//   // University Track
//   @Column({ type: 'varchar', nullable: true })
//   university: string;

//   @Column({ type: 'varchar', nullable: true })
//   faculty: string;

//   @Column({ type: 'varchar', nullable: true })
//   department: string;

//   @Column({ type: 'varchar', nullable: true })
//   courseOfStudy: string;

//   @Column({ type: 'varchar', nullable: true })
//   level: string;

//   // Goals & Preferences
//   @Column({ type: 'varchar', nullable: true })
//   examAimOrGoals: string;

//   @Column({ type: 'varchar', nullable: true })
//   preferredStudyTime: string;

//   @Column({ default: false })
//   isEmailVerified: boolean;

//   // Session & Security
//   @Column({ name: 'refresh_token', type: 'text', nullable: true })
//   refreshToken: string | null;

//   @Column({ name: 'is_restricted', default: false })
//   isRestricted: boolean;

//   @Column({ name: 'restriction_reason', type: 'text', nullable: true })
//   restrictionReason: string | null;

//   // Timestamps
//   @CreateDateColumn({ name: 'created_at' })
//   createdAt: Date;

//   @UpdateDateColumn({ name: 'updated_at' })
//   updatedAt: Date;
// }



// src/auth/entities/user.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  fullName: string;

  @Column({ type: 'varchar', unique: true })
  username: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar' })
  passwordHash: string;

  @Column({ type: 'varchar', nullable: true })
  dateOfBirth: string;

  @Column({ type: 'varchar', nullable: true })
  country: string;

  // Education Track Switch
  @Column({ type: 'varchar', nullable: true })
  educationType: string; // 'Secondary' | 'University'

  // Secondary School Track
  @Column({ type: 'varchar', nullable: true })
  secondarySchool: string;

  @Column({ type: 'varchar', nullable: true })
  secondaryClass: string;

  @Column({ type: 'varchar', nullable: true })
  secondaryStream: string;

  // University Track
  @Column({ type: 'varchar', nullable: true })
  university: string;

  @Column({ type: 'varchar', nullable: true })
  faculty: string;

  @Column({ type: 'varchar', nullable: true })
  department: string;

  @Column({ type: 'varchar', nullable: true })
  courseOfStudy: string;

  @Column({ type: 'varchar', nullable: true })
  level: string;

  // Goals & Preferences
  @Column({ type: 'varchar', nullable: true })
  examAimOrGoals: string;

  @Column({ type: 'varchar', nullable: true })
  preferredStudyTime: string;

  @Column({ default: false })
  isEmailVerified: boolean;

  // OTP Verification & Expiry
  @Column({ name: 'verification_otp', type: 'varchar', length: 6, nullable: true })
  verificationOtp: string | null;

  @Column({ name: 'otp_expires_at', type: 'timestamp', nullable: true })
  otpExpiresAt: Date | null;

  // Session & Security
  @Column({ name: 'refresh_token', type: 'text', nullable: true })
  refreshToken: string | null;

  @Column({ name: 'is_restricted', default: false })
  isRestricted: boolean;

  @Column({ name: 'restriction_reason', type: 'text', nullable: true })
  restrictionReason: string | null;

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}