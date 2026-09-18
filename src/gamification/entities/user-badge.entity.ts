// // src/gamification/entities/user-badge.entity.ts
// import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
// import { User } from '../../auth/entities/user.entity.js';
// import { Badge } from './badge.entity.js';

// @Entity('user_badges')
// export class UserBadge {
//   @PrimaryGeneratedColumn('uuid')
//   id: string;

//   @Column()
//   userId: string;

//   @ManyToOne(() => User, { onDelete: 'CASCADE' })
//   @JoinColumn({ name: 'userId' })
//   user: User;

//   @Column()
//   badgeId: string;

//   @ManyToOne(() => Badge, (badge) => badge.userBadges, { onDelete: 'CASCADE' })
//   @JoinColumn({ name: 'badgeId' })
//   badge: Badge;

//   @CreateDateColumn()
//   earnedAt: Date;
// }



// src/gamification/entities/user-badge.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity.js';

@Entity('user_badges')
export class UserBadge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  badgeId: string;

  // Use string entity target name without importing the class
  @ManyToOne('Badge', 'userBadges', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'badgeId' })
  badge: any;

  @CreateDateColumn()
  earnedAt: Date;
}