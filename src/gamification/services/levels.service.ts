// src/gamification/services/levels.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { XpTransaction } from '../../xp/entities/xp-transaction.entity.js';

@Injectable()
export class LevelsService {
  constructor(
    @InjectRepository(XpTransaction)
    private readonly xpRepo: Repository<XpTransaction>,
  ) {}

  getSystemLevels() {
    return {
      status: 'success',
      formula: '500 XP = 1 Level',
      tiers: [
        { level: 1, title: 'Novice Scholar', minXp: 0 },
        { level: 5, title: 'Apprentice', minXp: 2000 },
        { level: 10, title: 'Journeyman Scholar', minXp: 4500 },
        { level: 20, title: 'Master Academic', minXp: 9500 },
      ],
    };
  }

  async getUserLevel(userId: string) {
    // Fetch all XP transactions for the user directly from the ledger entity
    const transactions = await this.xpRepo.find({ where: { userId } });
    const totalXp = transactions.reduce((sum, tx) => sum + tx.amount, 0);

    // Calculate level dynamically (500 XP = 1 Level, minimum level 1)
    const currentLevel = Math.floor(totalXp / 500) + 1;
    const xpIntoCurrentLevel = totalXp % 500;
    const xpNeededForNextLevel = 500 - xpIntoCurrentLevel;

    return {
      status: 'success',
      userId,
      currentLevel,
      totalXp,
      progress: {
        xpIntoCurrentLevel,
        xpNeededForNextLevel,
        nextLevelAt: currentLevel * 500,
      },
    };
  }
}