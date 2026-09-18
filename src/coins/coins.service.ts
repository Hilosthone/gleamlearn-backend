// src/coins/coins.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CoinTransaction } from './entities/coin-transaction.entity.js';

@Injectable()
export class CoinsService {
  constructor(
    @InjectRepository(CoinTransaction)
    private readonly coinRepo: Repository<CoinTransaction>,
  ) {}

  // 1. Get total coin balance
  async getUserBalance(userId: string) {
    const transactions = await this.coinRepo.find({ where: { userId } });
    const balance = transactions.reduce((sum, tx) => sum + tx.amount, 0);

    return {
      balance,
      totalTransactions: transactions.length,
    };
  }

  // 2. Get transaction history ledger
  async getCoinHistory(userId: string) {
    return await this.coinRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  // 3. Server-side authorized coin reward (Internal system use only)
  async awardCoins(userId: string, amount: number, source: string, description: string) {
    if (amount <= 0) {
      throw new HttpException('Coin reward amount must be greater than zero', HttpStatus.BAD_REQUEST);
    }

    const transaction = this.coinRepo.create({
      userId,
      amount, // Positive value
      source,
      description,
    });

    return await this.coinRepo.save(transaction);
  }

  // 4. Server-side authorized coin spending with balance check
  async spendCoins(userId: string, amount: number, source: string, description: string) {
    if (amount <= 0) {
      throw new HttpException('Coin spend amount must be greater than zero', HttpStatus.BAD_REQUEST);
    }

    // Check current balance first
    const { balance } = await this.getUserBalance(userId);
    if (balance < amount) {
      throw new HttpException('Insufficient coin balance for this transaction', HttpStatus.BAD_REQUEST);
    }

    const transaction = this.coinRepo.create({
      userId,
      amount: -Math.abs(amount), // Negative value for deduction
      source,
      description,
    });

    return await this.coinRepo.save(transaction);
  }
}