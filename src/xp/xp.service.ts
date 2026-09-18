// src/xp/xp.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { XpTransaction } from './entities/xp-transaction.entity.js';
import { User } from '../auth/entities/user.entity.js';

@Injectable()
export class XpService {
  constructor(
    @InjectRepository(XpTransaction)
    private readonly xpRepo: Repository<XpTransaction>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // 1. Calculate user level based on total XP (Every 500 XP = 1 Level)
  private calculateLevel(totalXp: number): { level: number; currentXp: number; nextLevelXp: number } {
    const xpPerLevel = 500;
    const level = Math.floor(totalXp / xpPerLevel) + 1;
    const currentXp = totalXp % xpPerLevel;
    return {
      level,
      currentXp,
      nextLevelXp: xpPerLevel,
    };
  }

  // Get total XP and Level breakdown
  async getUserXpSummary(userId: string) {
    const transactions = await this.xpRepo.find({ where: { userId } });
    const totalXp = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const levelData = this.calculateLevel(totalXp);

    return {
      totalXp,
      ...levelData,
    };
  }

  // Get transaction history
  async getXpHistory(userId: string) {
    return await this.xpRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  // Automatically award XP after a valid activity (e.g., Quiz Completed)
  async awardXp(userId: string, amount: number, source: string, description: string) {
    const transaction = this.xpRepo.create({
      userId,
      amount,
      source,
      description,
    });

    return await this.xpRepo.save(transaction);
  }
}