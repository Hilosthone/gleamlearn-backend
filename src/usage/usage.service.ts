// src/usage/usage.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class UsageService {
  constructor(private readonly prisma: PrismaService) {}

  private async getUserTier(userId: string) {
    const activeSub = await this.prisma.userSubscription.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: { plan: true },
    });
    return activeSub ? 'PREMIUM' : 'FREE';
  }

  async getUsageOverview(userId: string) {
    const tier = await this.getUserTier(userId);
    const aiUsage = await this.getAiUsage(userId);
    const documentUsage = await this.getDocumentUsage(userId);
    const quizUsage = await this.getQuizUsage(userId);

    return {
      tier,
      quotas: {
        ai: aiUsage,
        documents: documentUsage,
        quizzes: quizUsage,
      },
    };
  }

  async getAiUsage(userId: string) {
    const tier = await this.getUserTier(userId);
    const limit = tier === 'PREMIUM' ? 100 : 10; // Free: 10/day, Premium: 100/day

    // Count AI requests made today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const used = await this.prisma.aiUsageLog.count({
      where: {
        userId,
        createdAt: { gte: startOfDay },
      },
    });

    return {
      limit,
      used,
      remaining: Math.max(0, limit - used),
      resetAt: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000),
    };
  }

  async getDocumentUsage(userId: string) {
    const tier = await this.getUserTier(userId);
    const limit = tier === 'PREMIUM' ? 50 : 5;
    const used = await this.prisma.studyMaterial.count({ where: { userId } });

    return {
      limit,
      used,
      remaining: Math.max(0, limit - used),
    };
  }

  async getQuizUsage(userId: string) {
    const tier = await this.getUserTier(userId);
    const limit = tier === 'PREMIUM' ? 200 : 20;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const used = await this.prisma.quizAttempt.count({
      where: {
        userId,
        createdAt: { gte: startOfDay },
      },
    });

    return {
      limit,
      used,
      remaining: Math.max(0, limit - used),
    };
  }
}