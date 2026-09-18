// src/gamification/services/badges.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Badge } from '../entities/badge.entity.js';
import { UserBadge } from '../entities/user-badge.entity.js';

@Injectable()
export class BadgesService {
  constructor(
    @InjectRepository(Badge)
    private readonly badgeRepo: Repository<Badge>,
    @InjectRepository(UserBadge)
    private readonly userBadgeRepo: Repository<UserBadge>,
  ) {}

  async findAll() {
    const badges = await this.badgeRepo.find();
    return { status: 'success', badges };
  }

  async findUserBadges(userId: string) {
    const userBadges = await this.userBadgeRepo.find({
      where: { userId },
      relations: { badge: true }, // Fixed TypeORM relations syntax
      order: { earnedAt: 'DESC' },
    });
    return { status: 'success', userId, earnedBadges: userBadges };
  }
}