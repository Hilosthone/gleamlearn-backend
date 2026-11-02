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

  // The database column is numeric, which PostgreSQL returns as a string: without this, adding amounts
  // concatenated them ("0" + "5.00" → "05.00") and coin balances read wrongly. No schema change.
  @Column({ type: 'int', transformer: { to: (v: number) => v, from: (v: string | number | null) => (v === null || v === undefined ? 0 : Number(v)) } })
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