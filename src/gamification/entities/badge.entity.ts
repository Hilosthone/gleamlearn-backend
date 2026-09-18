// src/gamification/entities/badge.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { UserBadge } from './user-badge.entity.js';

@Entity('badges')
export class Badge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string; // e.g., 'BRONZE_SCHOLAR', 'GOLD_GRANDMASTER'

  @Column()
  name: string;

  @Column()
  iconUrl: string;

  @Column()
  criteria: string; // Description of requirement to earn badge

  @OneToMany(() => UserBadge, (ub) => ub.badge)
  userBadges: UserBadge[];

  @CreateDateColumn()
  createdAt: Date;
}