import type { DataSource } from 'typeorm';
import { learnerTopicStats } from '../analytics/topic-stats.js';
import { isMissingTable } from '../common/errors/missing-table.js';
import { Quiz } from '../quizzes/entities/quiz.entity.js';
import { Exam } from '../exams/entities/exam.entity.js';
import { LearningResource, LearnerAssessment, AssessmentAttempt } from '../learning/entities.js';
import { PersonalCourse, PersonalCourseModule } from '../learner-content/entities.js';
import { ExamPrep } from '../exam-prep/entities/exam-prep.entity.js';

/*
 * Learning recommendations computed from the learner's OWN records (replaces the 501 placeholders). Every item says
 * why it is recommended, using real numbers. With no data a list is empty — nothing is invented.
 */
const WEAK_BELOW = 70;
const LIMIT = 10;

export interface Rec {
  type: 'topic' | 'quiz' | 'my_quiz' | 'exam' | 'my_exam' | 'lesson' | 'module';
  id: string | null;
  title: string;
  reason: string;
  href: string;
}

/** Runs a read; a table that does not exist on this database yields []. */
async function safe<T>(fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn();
  } catch (err) {
    if (isMissingTable(err)) return [];
    throw err;
  }
}

const matches = (text: string | null | undefined, topic: string) => !!text && text.toLowerCase().includes(topic.toLowerCase());

export async function weakTopics(ds: DataSource, userId: string) {
  return (await learnerTopicStats(ds, userId)).filter((t) => t.total >= 2 && t.percent < WEAK_BELOW);
}

export async function recommendTopics(ds: DataSource, userId: string): Promise<Rec[]> {
  return (await weakTopics(ds, userId)).slice(0, LIMIT).map((t) => ({
    type: 'topic',
    id: null,
    title: t.topic,
    reason: `You answered ${t.correct} of ${t.total} questions on it correctly (${t.percent}%).`,
    href: `/learn?topic=${encodeURIComponent(t.topic)}`,
  }));
}

export async function recommendQuizzes(ds: DataSource, userId: string): Promise<Rec[]> {
  const weak = await weakTopics(ds, userId);
  const out: Rec[] = [];
  if (weak.length) {
    const quizzes = await safe(() => ds.getRepository(Quiz).find({ order: { createdAt: 'DESC' }, take: 300 }));
    for (const t of weak) {
      const q = quizzes.find((x) => matches(x.topic, t.topic) || matches(x.title, t.topic));
      if (q && !out.some((o) => o.id === q.id)) out.push({ type: 'quiz', id: q.id, title: q.title || 'Quiz', reason: `Practises ${t.topic}, where you scored ${t.percent}%.`, href: '/practice' });
    }
  }
  const mine = await safe(() => ds.getRepository(LearnerAssessment).find({ where: { userId, kind: 'quiz' }, order: { createdAt: 'DESC' }, take: 50 }));
  if (mine.length) {
    const attempts = await safe(() => ds.getRepository(AssessmentAttempt).find({ where: { userId }, select: { assessmentId: true, status: true, score: true } }));
    for (const a of mine) {
      const done = attempts.filter((t) => t.assessmentId === a.id && t.status === 'submitted');
      const best = done.length ? Math.max(...done.map((t) => t.score ?? 0)) : null;
      if (best === null) out.push({ type: 'my_quiz', id: a.id, title: a.title, reason: 'You made this quiz but have not taken it yet.', href: `/practice/${a.id}` });
      else if (best < WEAK_BELOW) out.push({ type: 'my_quiz', id: a.id, title: a.title, reason: `Your best score is ${best}%. Try again.`, href: `/practice/${a.id}` });
    }
  }
  return out.slice(0, LIMIT);
}

export async function recommendRevision(ds: DataSource, userId: string): Promise<Rec[]> {
  const out: Rec[] = [];
  const resources = await safe(() => ds.getRepository(LearningResource).find({ where: { userId }, order: { createdAt: 'DESC' }, take: 50 }));
  for (const r of resources.filter((x) => !x.completedAt && !['flashcards', 'course_plan'].includes(x.kind)).slice(0, 5)) {
    out.push({ type: 'lesson', id: r.id, title: r.title, reason: 'You started this and have not finished it.', href: `/learn/resources/${r.id}` });
  }
  const courses = await safe(() => ds.getRepository(PersonalCourse).find({ where: { userId }, order: { updatedAt: 'DESC' }, take: 20 }));
  if (courses.length) {
    const modules = await safe(() => ds.getRepository(PersonalCourseModule).find({ where: { userId, isCompleted: false }, order: { position: 'ASC' } }));
    for (const c of courses.filter((x) => !x.archivedAt)) {
      const next = modules.find((m) => m.courseId === c.id);
      if (next) out.push({ type: 'module', id: next.id, title: `${next.title} (${c.title})`, reason: `The next unfinished module of your course “${c.title}”.`, href: `/my-courses/${c.id}` });
    }
  }
  return out.slice(0, LIMIT);
}

export async function recommendExams(ds: DataSource, userId: string): Promise<Rec[]> {
  const [exams, preps, mine] = await Promise.all([
    safe(() => ds.getRepository(Exam).find({ order: { createdAt: 'DESC' }, take: 200 })),
    safe(() => ds.getRepository(ExamPrep).find({ where: { userId } })),
    safe(() => ds.getRepository(LearnerAssessment).find({ where: { userId, kind: 'exam' }, order: { createdAt: 'DESC' }, take: 20 })),
  ]);
  const goals = preps.map((p) => String((p.studyPlan as { examType?: string } | null)?.examType ?? p.examinationId ?? '')).filter(Boolean);
  const scores = new Map<string, number>();
  for (const r of await safe<{ assessmentId: string; score: string | number }>(() => ds.query(`SELECT "assessmentId", MAX("score") AS score FROM "official_assessment_attempts" WHERE "userId" = $1 AND "kind" = 'exam' AND "status" = 'submitted' GROUP BY "assessmentId"`, [userId]))) scores.set(r.assessmentId, Number(r.score));
  const out: Rec[] = [];
  const ranked = [...exams].sort((a, b) => Number(goals.some((g) => matches(b.title, g))) - Number(goals.some((g) => matches(a.title, g))));
  for (const e of ranked) {
    const best = scores.get(e.id);
    const goal = goals.find((g) => matches(e.title, g));
    if (best === undefined) out.push({ type: 'exam', id: e.id, title: e.title || 'Exam', reason: goal ? `Matches your ${goal} preparation; you have not taken it yet.` : 'You have not taken this exam yet.', href: '/exams' });
    else if (best < WEAK_BELOW) out.push({ type: 'exam', id: e.id, title: e.title || 'Exam', reason: `Your best score is ${best}%; aim for ${WEAK_BELOW}%.`, href: '/exams' });
  }
  if (mine.length) {
    const attempts = await safe(() => ds.getRepository(AssessmentAttempt).find({ where: { userId, status: 'submitted' }, select: { assessmentId: true } }));
    for (const a of mine.filter((x) => !attempts.some((t) => t.assessmentId === x.id))) out.push({ type: 'my_exam', id: a.id, title: a.title, reason: 'You made this mock exam but have not taken it yet.', href: `/practice/${a.id}` });
  }
  return out.slice(0, LIMIT);
}
