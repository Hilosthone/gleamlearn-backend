// // src/coins/entities/coin-transaction.entity.ts
// import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
// import { User } from '../../auth/entities/user.entity.js';

// @Entity('coin_transactions')
// export class CoinTransaction {
//   @PrimaryGeneratedColumn('uuid')
//   id: string;

//   @Column()
//   userId: string;

//   @ManyToOne(() => User, { onDelete: 'CASCADE' })
//   @JoinColumn({ name: 'userId' })
//   user: User;

//   @Column({ type: 'int' })
//   amount: number; // Positive for earnings, negative for spending

//   @Column({ type: 'varchar' })
//   source: string; // e.g., 'QUIZ_COMPLETED', 'COURSE_PURCHASE', 'STORE_REWARD'

//   @Column({ type: 'text', nullable: true })
//   description: string;

//   @CreateDateColumn()
//   createdAt: Date;
// }


// src/coins/entities/coin-transaction.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity.js'; 

@Entity('coin_transactions')
export class CoinTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'int' })
  amount: number; // Positive for earnings, negative for spending

  @Column({ type: 'varchar', nullable: true })
  type: string; // e.g., 'EARN', 'SPEND', 'ADMIN_GRANT', 'ADMIN_DEDUCT'

  @Column({ type: 'varchar' })
  source: string; // e.g., 'QUIZ_COMPLETED', 'COURSE_PURCHASE', 'STORE_REWARD'

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}