// // src/gamification/entities/user-achievement.entity.ts
// import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
// import { User } from '../../auth/entities/user.entity.js';
// import { Achievement } from './achievement.entity.js';

// @Entity('user_achievements')
// export class UserAchievement {
//   @PrimaryGeneratedColumn('uuid')
//   id: string;

//   @Column()
//   userId: string;

//   @ManyToOne(() => User, { onDelete: 'CASCADE' })
//   @JoinColumn({ name: 'userId' })
//   user: User;

//   @Column()
//   achievementId: string;

//   @ManyToOne(() => Achievement, (achievement) => achievement.userAchievements, { onDelete: 'CASCADE' })
//   @JoinColumn({ name: 'achievementId' })
//   achievement: Achievement;

//   @CreateDateColumn()
//   unlockedAt: Date;
// }




// src/gamification/entities/user-achievement.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity.js';

@Entity('user_achievements')
export class UserAchievement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  achievementId: string;

  // Use string entity target name without importing the class
  @ManyToOne('Achievement', 'userAchievements', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'achievementId' })
  achievement: any;

  @CreateDateColumn()
  unlockedAt: Date;
}