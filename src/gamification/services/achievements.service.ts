// src/gamification/services/achievements.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Achievement } from '../entities/achievement.entity.js';
import { UserAchievement } from '../entities/user-achievement.entity.js';

@Injectable()
export class AchievementsService {
  constructor(
    @InjectRepository(Achievement)
    private readonly achievementRepo: Repository<Achievement>,
    @InjectRepository(UserAchievement)
    private readonly userAchievementRepo: Repository<UserAchievement>,
  ) {}

  async findAll() {
    const achievements = await this.achievementRepo.find();
    return { status: 'success', achievements };
  }

  async findUserAchievements(userId: string) {
    const unlocked = await this.userAchievementRepo.find({
      where: { userId },
      relations: { achievement: true }, // Fixed TypeORM relations syntax
      order: { unlockedAt: 'DESC' },
    });
    return { status: 'success', userId, unlockedAchievements: unlocked };
  }

  async findOne(id: string) {
    const achievement = await this.achievementRepo.findOne({ where: { id } });
    if (!achievement) {
      throw new HttpException('Achievement not found', HttpStatus.NOT_FOUND);
    }
    return { status: 'success', achievement };
  }
}