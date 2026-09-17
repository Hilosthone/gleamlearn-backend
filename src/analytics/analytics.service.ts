// src/analytics/analytics.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPerformance } from './entities/user-performance.entity.js';
import { AnalyticsQueryDto } from './dto/analytics-query.dto.js';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(UserPerformance)
    private performanceRepo: Repository<UserPerformance>,
  ) {}

  async getOverview(userId: string, query?: AnalyticsQueryDto) {
    const performances = await this.performanceRepo.find({ where: { userId } });
    const totalAssessments = performances.length;
    const avgScore = totalAssessments > 0 
      ? performances.reduce((acc, curr) => acc + curr.score, 0) / totalAssessments 
      : 0;
    const totalTimeSpent = performances.reduce((acc, curr) => acc + curr.timeSpentSeconds, 0);

    return {
      status: 'success',
      totalAssessments,
      averageScore: Number(avgScore.toFixed(2)),
      totalTimeSpentMinutes: Math.round(totalTimeSpent / 60),
      masteryLevel: avgScore >= 80 ? 'Advanced' : avgScore >= 50 ? 'Intermediate' : 'Beginner',
    };
  }

  async getCoursesAnalytics(userId: string, query?: AnalyticsQueryDto) {
    return { status: 'success', analytics: 'Aggregated course performance breakdown.' };
  }

  async getCourseAnalyticsById(userId: string, courseId: string, query?: AnalyticsQueryDto) {
    return { status: 'success', courseId, performance: 'Detailed analytics for specific course.' };
  }

  async getTopicsAnalytics(userId: string) {
    return { status: 'success', topics: [], message: 'Topic-by-topic mastery distribution.' };
  }

  async getWeakTopics(userId: string) {
    return { status: 'success', weakTopics: [], recommendation: 'Recommended review topics based on low scores.' };
  }

  async getStrongTopics(userId: string) {
    return { status: 'success', strongTopics: [], message: 'Topics with high proficiency scores.' };
  }

  async getPerformanceByType(userId: string, type: 'quiz' | 'test' | 'exam', query?: AnalyticsQueryDto) {
    const records = await this.performanceRepo.find({ where: { userId, assessmentType: type } });
    const avg = records.length > 0 ? records.reduce((acc, r) => acc + r.score, 0) / records.length : 0;
    return {
      status: 'success',
      assessmentType: type,
      totalCompleted: records.length,
      averageScore: Number(avg.toFixed(2)),
      history: records,
    };
  }

  async getTimeSpent(userId: string, query?: AnalyticsQueryDto) {
    const performances = await this.performanceRepo.find({ where: { userId } });
    const totalSeconds = performances.reduce((acc, curr) => acc + curr.timeSpentSeconds, 0);
    return {
      status: 'success',
      totalTimeSpentSeconds: totalSeconds,
      totalTimeSpentHours: Number((totalSeconds / 3600).toFixed(2)),
    };
  }

  async getMastery(userId: string) {
    return { status: 'success', overallMasteryPercentage: 78.5, breakdown: {} };
  }
}