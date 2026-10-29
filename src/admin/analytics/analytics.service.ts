// src/admin/analytics/analytics.service.ts
import { featureUnavailable } from '../../common/errors/feature-unavailable.js';
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

  async getOverviewAnalytics(_query: AnalyticsQueryDto): Promise<never> {
    throw featureUnavailable('Admin analytics', 'platform-wide learning analytics are not computed yet (the previous figures were invented)');
  }

  async getStudentsAnalytics(_query: AnalyticsQueryDto): Promise<never> {
    throw featureUnavailable('Admin analytics', 'platform-wide learning analytics are not computed yet (the previous figures were invented)');
  }

  async getCoursesAnalytics(_query: AnalyticsQueryDto): Promise<never> {
    throw featureUnavailable('Admin analytics', 'platform-wide learning analytics are not computed yet (the previous figures were invented)');
  }

  async getSubjectsAnalytics(_query: AnalyticsQueryDto): Promise<never> {
    throw featureUnavailable('Admin analytics', 'platform-wide learning analytics are not computed yet (the previous figures were invented)');
  }

  async getExamsAnalytics(_query: AnalyticsQueryDto): Promise<never> {
    throw featureUnavailable('Admin analytics', 'platform-wide learning analytics are not computed yet (the previous figures were invented)');
  }

  async getQuizzesAnalytics(_query: AnalyticsQueryDto): Promise<never> {
    throw featureUnavailable('Admin analytics', 'platform-wide learning analytics are not computed yet (the previous figures were invented)');
  }

  async getTestsAnalytics(_query: AnalyticsQueryDto): Promise<never> {
    throw featureUnavailable('Admin analytics', 'platform-wide learning analytics are not computed yet (the previous figures were invented)');
  }

  async getLearningAnalytics(_query: AnalyticsQueryDto): Promise<never> {
    throw featureUnavailable('Admin analytics', 'platform-wide learning analytics are not computed yet (the previous figures were invented)');
  }

  async getRetentionAnalytics(_query: AnalyticsQueryDto): Promise<never> {
    throw featureUnavailable('Admin analytics', 'platform-wide learning analytics are not computed yet (the previous figures were invented)');
  }

  async getStreaksAnalytics(_query: AnalyticsQueryDto): Promise<never> {
    throw featureUnavailable('Admin analytics', 'platform-wide learning analytics are not computed yet (the previous figures were invented)');
  }
}