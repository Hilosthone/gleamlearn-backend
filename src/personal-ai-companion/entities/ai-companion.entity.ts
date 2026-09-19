// // src/personal-ai-companion/entities/ai-companion.entity.ts
// import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// @Entity('ai_companions')
// export class AiCompanion {
//   @PrimaryGeneratedColumn('uuid')
//   id: string;

//   @Column({ unique: true })
//   userId: string;

//   @Column({ default: 'Nova' })
//   name: string;

//   @Column({ nullable: true })
//   gender: string;

//   @Column({ default: 'Friendly and Encouraging' })
//   personality: string;

//   @Column({ nullable: true })
//   voice: string;

//   @Column({ nullable: true })
//   appearance: string;

//   @Column({ nullable: true })
//   outfit: string;

//   @Column({ default: 'Socratic' })
//   teachingStyle: string;

//   @CreateDateColumn()
//   createdAt: Date;

//   @UpdateDateColumn()
//   updatedAt: Date;
// }


// src/personal-ai-companion/entities/ai-companion.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('ai_companions')
export class AiCompanion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  userId: string;

  @Column({ default: 'Nova' })
  name: string;

  @Column({ nullable: true })
  gender: string;

  @Column({ default: 'Friendly and Encouraging' })
  personality: string;

  @Column({ nullable: true })
  voice: string;

  @Column({ nullable: true })
  appearance: string;

  @Column({ nullable: true })
  outfit: string;

  @Column({ default: 'Socratic' })
  teachingStyle: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}