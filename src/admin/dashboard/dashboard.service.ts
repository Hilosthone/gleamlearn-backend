// src/admin/dashboard/dashboard.service.ts
import { featureUnavailable } from '../../common/errors/feature-unavailable.js';
import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, MoreThan, type EntityTarget, type ObjectLiteral } from 'typeorm';
import { Quiz } from '../../quizzes/entities/quiz.entity.js';
import { Test } from '../../tests/entities/test.entity.js';
import { Exam } from '../../exams/entities/exam.entity.js';
import { Course } from '../../courses/entities/course.entity.js';
import { FileEntity } from '../../files/entities/file.entity.js';
import { YoutubeEntity } from '../../youtube/entities/youtube.entity.js';
import { TutorSession } from '../../ai-tutor/entities/tutor-session.entity.js';
import { AiConversation } from '../../personal-ai/entities/conversation.entity.js';
import { XpTransaction } from '../../xp/entities/xp-transaction.entity.js';
import { CoinTransaction } from '../../coins/entities/coin-transaction.entity.js';
import { User } from '../../auth/entities/user.entity.js';
import { DashboardMetric } from './entities/dashboard-metric.entity.js';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(DashboardMetric)
    private readonly metricRepo: Repository<DashboardMetric>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * GET /admin/dashboard/counts — figures computed directly from the database, nothing estimated.
   * Each value is an exact COUNT/SUM over one table; a value is null (never invented) if its query fails,
   * and `unavailable` lists which ones.
   */
  async getVerifiedCounts() {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const count = <T extends ObjectLiteral>(entity: EntityTarget<T>, where?: object) =>
      this.dataSource.getRepository(entity).count(where ? { where: where as any } : undefined);
    const positiveSum = async <T extends ObjectLiteral>(entity: EntityTarget<T>) =>
      (await this.dataSource.getRepository(entity).sum('amount' as any, { amount: MoreThan(0) } as any)) ?? 0;

    const queries: Record<string, () => Promise<number>> = {
      learners: () => count(User),
      newLearnersLast30Days: () => count(User, { createdAt: MoreThan(since) }),
      learnerCourses: () => count(Course),
      quizzes: () => count(Quiz),
      tests: () => count(Test),
      exams: () => count(Exam),
      uploadedFiles: () => count(FileEntity),
      youtubeResources: () => count(YoutubeEntity),
      aiTutorSessions: () => count(TutorSession),
      aiAssistantConversations: () => count(AiConversation),
      xpAwarded: () => positiveSum(XpTransaction),
      coinsAwarded: () => positiveSum(CoinTransaction),
    };

    const keys = Object.keys(queries);
    const results = await Promise.allSettled(keys.map((k) => queries[k]()));
    const counts: Record<string, number | null> = {};
    const unavailable: string[] = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') counts[keys[i]] = Number(r.value);
      else {
        counts[keys[i]] = null;
        unavailable.push(keys[i]);
      }
    });

    return { status: 'success', data: { counts, unavailable, generatedAt: new Date().toISOString() } };
  }

  async getOverview() {
    // Only what is counted. Activity, premium, learning and revenue figures used to be guesses (DAU = 15% of all
    // users) or zeros; GET /admin/dashboard/counts has the verified catalogue and learner counts.
    const totalUsers = await this.userRepo.count();
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 30);
    const newUsersCount = await this.userRepo.count({ where: { createdAt: MoreThan(recentDate) } });
    return {
      status: 'success',
      data: {
        users: { total: totalUsers, new: newUsersCount, dau: null, mau: null },
        notMeasured: ['active users', 'suspended and deleted users', 'premium users', 'learning totals', 'revenue'],
      },
    };
  }

  async getUsersMetrics() {
    const totalUsers = await this.userRepo.count();
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 30);
    const newUsers = await this.userRepo.count({ where: { createdAt: MoreThan(recentDate) } });
    return { status: 'success', data: { totalUsers, newUsers, dailyActiveUsers: null, monthlyActiveUsers: null } };
  }

  async getActivityMetrics(): Promise<never> {
    throw featureUnavailable('Activity metrics', 'logins and sessions are not tracked (the previous figures were invented)');
  }

  async getRevenueMetrics(): Promise<never> {
    throw featureUnavailable('Revenue metrics', 'payments are not live');
  }

  async getLearningMetrics(): Promise<never> {
    throw featureUnavailable('Learning metrics', 'use GET /admin/dashboard/counts for the verified counts');
  }

  async getEngagementMetrics(): Promise<never> {
    throw featureUnavailable('Engagement metrics', 'active users, session length and completion rate are not measured (the previous figures were invented)');
  }
}