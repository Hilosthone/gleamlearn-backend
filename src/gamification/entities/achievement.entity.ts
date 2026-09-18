// src/gamification/entities/achievement.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { UserAchievement } from './user-achievement.entity.js';

@Entity('achievements')
export class Achievement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string; // e.g., 'FIRST_QUIZ', 'SCORE_HUNDRED'

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'int', default: 0 })
  rewardXp: number;

  @Column({ type: 'int', default: 0 })
  rewardCoins: number;

  @OneToMany(() => UserAchievement, (ua) => ua.achievement)
  userAchievements: UserAchievement[];

  @CreateDateColumn()
  createdAt: Date;
}