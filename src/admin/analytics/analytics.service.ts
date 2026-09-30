// src/admin/analytics/analytics.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PerformanceMetric } from './entities/performance-metric.entity.js';
import { AnalyticsQueryDto } from './dto/analytics-query.dto.js';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(PerformanceMetric)
    private readonly metricRepo: Repository<PerformanceMetric>,
  ) {}

  async getOverviewAnalytics(query: AnalyticsQueryDto) {
    return {
      status: 'success',
      data: {
        period: query.period,
        platformScore: 88.5,
        totalActiveLearners: 1240,
        averageCompletionRate: '74.2%',
        overallEngagementGrowth: '+12.4%',
      },
    };
  }

  async getStudentsAnalytics(query: AnalyticsQueryDto) {
    return {
      status: 'success',
      data: {
        period: query.period,
        topPerformersCount: 45,
        strugglingStudentsCount: 12,
        averageStudyTimePerStudentHours: 18.5,
      },
    };
  }

  async getCoursesAnalytics(query: AnalyticsQueryDto) {
    return {
      status: 'success',
      data: {
        period: query.period,
        mostPopularCourse: 'Advanced Full-Stack Engineering',
        highestRatedCourse: 'Mobile UI/UX Masterclass',
        averageCourseCompletionRate: '68.5%',
      },
    };
  }

  async getSubjectsAnalytics(query: AnalyticsQueryDto) {
    return {
      status: 'success',
      data: {
        period: query.period,
        topSubject: 'Software Architecture',
        totalActiveSubjects: 28,
      },
    };
  }

  async getExamsAnalytics(query: AnalyticsQueryDto) {
    return {
      status: 'success',
      data: {
        period: query.period,
        totalExamsTaken: 340,
        averageExamScore: '76.8%',
        passRate: '82.4%',
      },
    };
  }

  async getQuizzesAnalytics(query: AnalyticsQueryDto) {
    return {
      status: 'success',
      data: {
        period: query.period,
        totalQuizzesCompleted: 1890,
        averageQuizScore: '84.1%',
      },
    };
  }

  async getTestsAnalytics(query: AnalyticsQueryDto) {
    return {
      status: 'success',
      data: {
        period: query.period,
        totalTestsTaken: 720,
        averageTestScore: '79.3%',
      },
    };
  }

  async getLearningAnalytics(query: AnalyticsQueryDto) {
    return {
      status: 'success',
      data: {
        period: query.period,
        totalLearningHoursRecorded: 4320,
        totalXpAwarded: 154000,
        totalCoinsAwarded: 28500,
      },
    };
  }

  async getRetentionAnalytics(query: AnalyticsQueryDto) {
    return {
      status: 'success',
      data: {
        period: query.period,
        day1Retention: '85.2%',
        day7Retention: '62.4%',
        day30Retention: '45.1%',
      },
    };
  }

  async getStreaksAnalytics(query: AnalyticsQueryDto) {
    return {
      status: 'success',
      data: {
        period: query.period,
        activeStreaksCount: 310,
        longestActiveStreakDays: 45,
        averageStreakDays: 6.2,
      },
    };
  }
}