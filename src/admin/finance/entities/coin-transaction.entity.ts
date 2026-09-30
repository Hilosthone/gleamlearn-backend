// src/admin/finance/entities/coin-transaction.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('coin_transactions')
export class CoinTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  amount: number;

  @Column({ type: 'varchar', length: 50 })
  type: string; // e.g., 'EARN', 'SPEND'

  @Column({ type: 'varchar', length: 100, nullable: true })
  source: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}