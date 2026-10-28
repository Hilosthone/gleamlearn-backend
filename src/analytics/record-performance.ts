import type { EntityManager } from 'typeorm';
import { isMissingTable } from '../common/errors/missing-table.js';
import { UserPerformance } from './entities/user-performance.entity.js';

/**
 * Records one graded assessment for the learner's analytics (user_performances). Called after a submission has been
 * graded and stored; it never fails the submission: a missing table is skipped, any other error is logged (code only,
 * never answers or content) and ignored.
 */
export async function recordPerformance(
  manager: EntityManager | undefined,
  row: { userId: string; assessmentType: 'quiz' | 'test' | 'exam'; assessmentId: string; courseId?: string | null; score: number; topics: string[]; startedAt?: Date | null; submittedAt?: Date | null },
): Promise<void> {
  if (!manager) return;
  const seconds = row.startedAt && row.submittedAt ? Math.round((row.submittedAt.getTime() - row.startedAt.getTime()) / 1000) : 0;
  try {
    await manager.getRepository(UserPerformance).insert({
      userId: row.userId,
      assessmentType: row.assessmentType,
      assessmentId: row.assessmentId,
      courseId: row.courseId ?? (null as never),
      score: Math.max(0, Math.min(100, Number(row.score) || 0)),
      topicsCovered: [...new Set(row.topics.filter(Boolean))].slice(0, 50),
      // an attempt left open for days is not "time spent": cap at 6 hours
      timeSpentSeconds: Math.max(0, Math.min(seconds, 6 * 3600)),
    });
  } catch (err) {
    if (isMissingTable(err)) return;
    console.warn(`[analytics] performance not recorded (${(err as { code?: string }).code ?? (err as Error).name})`);
  }
}
