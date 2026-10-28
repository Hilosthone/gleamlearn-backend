import type { EntityManager } from 'typeorm';
import { isMissingTable } from '../common/errors/missing-table.js';

export interface TopicStat {
  topic: string;
  correct: number;
  total: number;
  percent: number;
  attempts: number;
}

/**
 * Per-topic results across the learner's submitted attempts — official quizzes/tests/exams and their own quizzes and
 * mock exams (the stored reviews). A missing table is skipped. Weakest first.
 */
export async function learnerTopicStats(manager: Pick<EntityManager, 'query'>, userId: string): Promise<TopicStat[]> {
  const read = async (sql: string) => {
    try {
      return (await manager.query(sql, [userId])) as { topics: unknown }[];
    } catch (err) {
      if (isMissingTable(err)) return [];
      throw err;
    }
  };
  const rows = [
    ...(await read(`SELECT "review"->'topics' AS topics FROM "official_assessment_attempts" WHERE "userId" = $1 AND "status" = 'submitted' AND "graded" ORDER BY "submittedAt" DESC LIMIT 300`)),
    ...(await read(`SELECT "review"->'topics' AS topics FROM "assessment_attempts" WHERE "userId" = $1 AND "status" = 'submitted' ORDER BY "submittedAt" DESC LIMIT 300`)),
  ];
  const by = new Map<string, TopicStat>();
  for (const r of rows) {
    for (const t of Array.isArray(r.topics) ? (r.topics as Record<string, unknown>[]) : []) {
      const name = String(t?.topic ?? '').trim() || 'General';
      const s = by.get(name) ?? { topic: name, correct: 0, total: 0, percent: 0, attempts: 0 };
      s.correct += Number(t?.correct) || 0;
      s.total += Number(t?.total) || 0;
      s.attempts++;
      by.set(name, s);
    }
  }
  return [...by.values()]
    .filter((s) => s.total > 0)
    .map((s) => ({ ...s, percent: Math.round((s.correct / s.total) * 100) }))
    .sort((a, b) => a.percent - b.percent || b.total - a.total);
}
