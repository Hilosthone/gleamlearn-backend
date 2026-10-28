// src/usage/usage.service.ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { isMissingTable } from '../common/errors/missing-table.js';
import { MAX_COURSES, MAX_MATERIALS } from '../learner-content/learner-content.js';

export interface Quota {
  /** what is counted, in the learner's words */
  label: string;
  used: number;
  /** null: not capped (only limits the server actually enforces are reported) */
  limit: number | null;
  remaining: number | null;
  /** 'day': counted since midnight WAT, resetting at resetAt; 'total': everything kept */
  period: 'day' | 'total';
  resetAt: Date | null;
}

/** Days follow Nigerian time (Africa/Lagos), as streaks do. */
const TODAY = `date_trunc('day', now() AT TIME ZONE 'Africa/Lagos') AT TIME ZONE 'Africa/Lagos'`;

/**
 * Real usage from the learner's own records, against the limits the server enforces. The old version reported
 * invented daily caps (10 AI requests, 20 quizzes, 5 documents) that nothing enforced, read from Prisma tables that
 * never existed (always 501). There are no plans or tiers yet (subscriptions aren't live), so limits are the same
 * for everyone. A missing table counts as nothing used.
 */
@Injectable()
export class UsageService {
  constructor(private readonly db: DataSource) {}

  private async count(sql: string, userId: string): Promise<number> {
    try {
      const rows = (await this.db.query(sql, [userId])) as { n: string | number }[];
      return Number(rows[0]?.n) || 0;
    } catch (err) {
      if (isMissingTable(err)) return 0;
      throw err;
    }
  }

  private quota(label: string, used: number, limit: number | null, period: Quota['period'], resetAt: Date | null = null): Quota {
    return { label, used, limit, remaining: limit === null ? null : Math.max(0, limit - used), period, resetAt };
  }

  private async resetAt(): Promise<Date> {
    const rows = (await this.db.query(`SELECT (${TODAY}) + interval '1 day' AS t`)) as { t: Date }[];
    return new Date(rows[0].t);
  }

  async getUsageOverview(userId: string) {
    const [ai, documents, courses, quizzes] = await Promise.all([
      this.getAiUsage(userId),
      this.getDocumentUsage(userId),
      this.getCourseUsage(userId),
      this.getQuizUsage(userId),
    ]);
    return { plan: null, quotas: { ai, documents, courses, quizzes } };
  }

  async getAiUsage(userId: string): Promise<Quota> {
    const used =
      (await this.count(`SELECT count(*) AS n FROM "learning_resources" WHERE "userId" = $1 AND "createdAt" >= ${TODAY}`, userId)) +
      (await this.count(`SELECT count(*) AS n FROM "learner_assessments" WHERE "userId" = $1 AND "createdAt" >= ${TODAY}`, userId));
    return this.quota('AI-generated lessons, notes and quizzes today', used, null, 'day', await this.resetAt());
  }

  async getDocumentUsage(userId: string): Promise<Quota> {
    const used = await this.count(`SELECT count(*) AS n FROM "learner_materials" WHERE "userId" = $1`, userId);
    return this.quota('Uploaded materials', used, MAX_MATERIALS, 'total');
  }

  async getCourseUsage(userId: string): Promise<Quota> {
    const used = await this.count(`SELECT count(*) AS n FROM "personal_courses" WHERE "userId" = $1`, userId);
    return this.quota('Personal courses', used, MAX_COURSES, 'total');
  }

  async getQuizUsage(userId: string): Promise<Quota> {
    const used =
      (await this.count(`SELECT count(*) AS n FROM "assessment_attempts" WHERE "userId" = $1 AND "startedAt" >= ${TODAY}`, userId)) +
      (await this.count(`SELECT count(*) AS n FROM "official_assessment_attempts" WHERE "userId" = $1 AND "startedAt" >= ${TODAY}`, userId));
    return this.quota('Quizzes, tests and exams started today', used, null, 'day', await this.resetAt());
  }
}
