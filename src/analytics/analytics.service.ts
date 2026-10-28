// src/analytics/analytics.service.ts
import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { learnerTopicStats, type TopicStat } from './topic-stats.js';
import { UserPerformance } from './entities/user-performance.entity.js';
import { AnalyticsQueryDto } from './dto/analytics-query.dto.js';

/**
 * The learner's own assessment analytics, computed from real records only:
 *   - user_performances: one row per graded submission (official quizzes/tests/exams and the learner's own quizzes
 *     and mock exams; written by src/analytics/record-performance.ts);
 *   - per-topic results: the stored reviews of submitted attempts (official_assessment_attempts, assessment_attempts).
 * With no data every figure is empty or null — nothing is estimated. (Previously several routes returned fixed
 * placeholder text and a hard-coded 78.5 % mastery.)
 */
const WEAK_BELOW = 60;
const STRONG_FROM = 80;
const MIN_QUESTIONS = 2;

export type { TopicStat };

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(UserPerformance)
    private performanceRepo: Repository<UserPerformance>,
    @InjectDataSource() private readonly ds: DataSource,
  ) {}

  private async performances(userId: string, query?: AnalyticsQueryDto, extra: { courseId?: string; assessmentType?: string } = {}) {
    const courseId = extra.courseId ?? query?.courseId;
    const rows = await this.performanceRepo.find({ where: { userId, ...(courseId ? { courseId } : {}), ...(extra.assessmentType ? { assessmentType: extra.assessmentType } : {}) }, order: { createdAt: 'DESC' } });
    const from = query?.startDate ? new Date(query.startDate) : null;
    const to = query?.endDate ? new Date(query.endDate) : null;
    return rows.filter((r) => (!from || r.createdAt >= from) && (!to || r.createdAt <= to));
  }

  topicStats(userId: string): Promise<TopicStat[]> {
    return learnerTopicStats(this.ds, userId);
  }

  async getOverview(userId: string, query?: AnalyticsQueryDto) {
    const performances = await this.performances(userId, query);
    const totalAssessments = performances.length;
    const avgScore = totalAssessments > 0 ? performances.reduce((acc, curr) => acc + curr.score, 0) / totalAssessments : null;
    const totalTimeSpent = performances.reduce((acc, curr) => acc + curr.timeSpentSeconds, 0);
    return {
      status: 'success',
      totalAssessments,
      averageScore: avgScore === null ? null : Number(avgScore.toFixed(2)),
      totalTimeSpentMinutes: Math.round(totalTimeSpent / 60),
      masteryLevel: avgScore === null ? null : avgScore >= 80 ? 'Advanced' : avgScore >= 50 ? 'Intermediate' : 'Beginner',
      lastAssessmentAt: performances[0]?.createdAt ?? null,
    };
  }

  async getCoursesAnalytics(userId: string, query?: AnalyticsQueryDto) {
    const rows = (await this.performances(userId, query)).filter((r) => r.courseId);
    const by = new Map<string, { courseId: string; assessments: number; averageScore: number; lastScore: number; lastAt: Date }>();
    for (const r of rows) {
      const c = by.get(r.courseId) ?? { courseId: r.courseId, assessments: 0, averageScore: 0, lastScore: r.score, lastAt: r.createdAt };
      c.averageScore = (c.averageScore * c.assessments + r.score) / (c.assessments + 1);
      c.assessments++;
      by.set(r.courseId, c);
    }
    return { status: 'success', courses: [...by.values()].map((c) => ({ ...c, averageScore: Number(c.averageScore.toFixed(2)) })) };
  }

  async getCourseAnalyticsById(userId: string, courseId: string, query?: AnalyticsQueryDto) {
    const rows = await this.performances(userId, query, { courseId });
    const avg = rows.length ? rows.reduce((a, r) => a + r.score, 0) / rows.length : null;
    return {
      status: 'success',
      courseId,
      assessments: rows.length,
      averageScore: avg === null ? null : Number(avg.toFixed(2)),
      history: rows.map((r) => ({ assessmentType: r.assessmentType, assessmentId: r.assessmentId, score: r.score, topics: r.topicsCovered, at: r.createdAt })),
    };
  }

  async getTopicsAnalytics(userId: string) {
    return { status: 'success', topics: await this.topicStats(userId) };
  }

  async getWeakTopics(userId: string) {
    const weakTopics = (await this.topicStats(userId)).filter((t) => t.total >= MIN_QUESTIONS && t.percent < WEAK_BELOW);
    return { status: 'success', weakTopics, threshold: WEAK_BELOW };
  }

  async getStrongTopics(userId: string) {
    const strongTopics = (await this.topicStats(userId)).filter((t) => t.total >= MIN_QUESTIONS && t.percent >= STRONG_FROM).sort((a, b) => b.percent - a.percent);
    return { status: 'success', strongTopics, threshold: STRONG_FROM };
  }

  async getPerformanceByType(userId: string, type: 'quiz' | 'test' | 'exam', query?: AnalyticsQueryDto) {
    const records = await this.performances(userId, query, { assessmentType: type });
    const avg = records.length > 0 ? records.reduce((acc, r) => acc + r.score, 0) / records.length : null;
    return {
      status: 'success',
      assessmentType: type,
      totalCompleted: records.length,
      averageScore: avg === null ? null : Number(avg.toFixed(2)),
      history: records,
    };
  }

  async getTimeSpent(userId: string, query?: AnalyticsQueryDto) {
    const performances = await this.performances(userId, query);
    const totalSeconds = performances.reduce((acc, curr) => acc + curr.timeSpentSeconds, 0);
    return {
      status: 'success',
      totalTimeSpentSeconds: totalSeconds,
      totalTimeSpentHours: Number((totalSeconds / 3600).toFixed(2)),
    };
  }

  /** Overall mastery = correct / total across every graded question of the learner's attempts (null with none). */
  async getMastery(userId: string) {
    const topics = await this.topicStats(userId);
    const correct = topics.reduce((a, t) => a + t.correct, 0);
    const total = topics.reduce((a, t) => a + t.total, 0);
    return {
      status: 'success',
      overallMasteryPercentage: total ? Math.round((correct / total) * 1000) / 10 : null,
      questionsAnswered: total,
      breakdown: Object.fromEntries(topics.map((t) => [t.topic, t.percent])),
    };
  }
}
