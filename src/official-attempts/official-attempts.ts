import { Injectable, Module, NotFoundException } from '@nestjs/common';
import { InjectDataSource, TypeOrmModule } from '@nestjs/typeorm';
import { Column, DataSource, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { withTable, isMissingTable } from '../common/errors/missing-table.js';
import { reviewQuiz, type QuestionReview } from '../quizzes/utils/grade-quiz.util.js';
import { recordPerformance } from '../analytics/record-performance.js';
import { Quiz } from '../quizzes/entities/quiz.entity.js';
import { Test } from '../tests/entities/test.entity.js';
import { Exam } from '../exams/entities/exam.entity.js';

/*
 * Attempts at OFFICIAL quizzes, tests and exams (published by GleamLearn), owned by the learner who made them.
 * Table: database/migrations/20261028210252_official_assessment_attempts.sql. Until it exists, start / results /
 * history / readiness answer 501, while submitting still grades (as before) without saving.
 */

export type OfficialKind = 'quiz' | 'test' | 'exam';
const FEATURE = 'Saved attempts';
const READY_SCORE = 70;
const DEADLINE_GRACE_MS = 60_000;

@Entity('official_assessment_attempts')
export class OfficialAssessmentAttempt {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('uuid') userId: string;
  @Column({ type: 'varchar', length: 10 }) kind: OfficialKind;
  @Column('uuid') assessmentId: string;
  @Column({ type: 'varchar', length: 255, default: '' }) title: string;
  @Column({ type: 'varchar', length: 15, default: 'in_progress' }) status: 'in_progress' | 'submitted';
  @Column({ type: 'jsonb', default: () => "'{}'" }) answers: Record<string, string>;
  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true, transformer: { to: (v: number | null) => v, from: (v: string | null) => (v === null ? null : Number(v)) } }) score: number | null;
  @Column({ type: 'int', nullable: true }) correctCount: number | null;
  @Column({ type: 'int', nullable: true }) gradableCount: number | null;
  @Column({ type: 'int', default: 0 }) totalQuestions: number;
  @Column({ type: 'boolean', default: false }) graded: boolean;
  @Column({ type: 'jsonb', nullable: true }) review: { questions: QuestionReview[]; topics: TopicScore[] } | null;
  @Column({ type: 'timestamptz', default: () => 'now()' }) startedAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) deadlineAt: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) submittedAt: Date | null;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt: Date;
}

export interface TopicScore {
  topic: string;
  correct: number;
  total: number;
  percent: number;
}

const ENTITY = { quiz: Quiz, test: Test, exam: Exam } as const;

function topicsOf(questions: QuestionReview[]): TopicScore[] {
  const by = new Map<string, { correct: number; total: number }>();
  for (const q of questions.filter((x) => x.gradable)) {
    const t = q.topic || 'General';
    const v = by.get(t) ?? { correct: 0, total: 0 };
    v.total++;
    if (q.correct) v.correct++;
    by.set(t, v);
  }
  return [...by].map(([topic, v]) => ({ topic, ...v, percent: Math.round((v.correct / v.total) * 100) })).sort((a, b) => a.percent - b.percent);
}

/** The attempt without the answer key while it is in progress; with the review once submitted. */
function view(a: OfficialAssessmentAttempt) {
  const { review, ...rest } = a;
  return { ...rest, review: a.status === 'submitted' ? review : null };
}

@Injectable()
export class OfficialAttemptsService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  private get repo() {
    return this.ds.getRepository(OfficialAssessmentAttempt);
  }

  private async assessment(kind: OfficialKind, id: string): Promise<{ id: string; title: string; questions: any[]; durationMinutes?: number }> {
    const a = await this.ds.getRepository(ENTITY[kind] as never).findOne({ where: { id } as never });
    if (!a) throw new NotFoundException(`${kind[0].toUpperCase()}${kind.slice(1)} not found.`);
    return a as never;
  }

  /** Resumes the learner's open attempt or starts one; tests and exams get a deadline from their duration. */
  start(userId: string, kind: OfficialKind, assessmentId: string) {
    return withTable(FEATURE, async () => {
      const a = await this.assessment(kind, assessmentId);
      const open = await this.repo.findOne({ where: { userId, kind, assessmentId, status: 'in_progress' } });
      if (open) return { ...view(open), resumed: true };
      const now = new Date();
      const minutes = kind === 'quiz' ? 0 : Number(a.durationMinutes) || 0;
      try {
        const row = await this.repo.save(
          this.repo.create({ userId, kind, assessmentId, title: (a.title ?? '').slice(0, 255), totalQuestions: Array.isArray(a.questions) ? a.questions.length : 0, startedAt: now, deadlineAt: minutes > 0 ? new Date(now.getTime() + minutes * 60_000) : null }),
        );
        return { ...view(row), resumed: false };
      } catch (err) {
        if ((err as { code?: string; driverError?: { code?: string } }).driverError?.code === '23505' || (err as { code?: string }).code === '23505') {
          const again = await this.repo.findOne({ where: { userId, kind, assessmentId, status: 'in_progress' } });
          if (again) return { ...view(again), resumed: true }; // two clicks at once: the other request created it
        }
        throw err;
      }
    });
  }

  /**
   * Stores a graded submission: completes the learner's open attempt for this assessment, or records a new one.
   * Returns null when the table does not exist yet (the caller still returns the grade, as before).
   */
  async recordSubmission(userId: string, kind: OfficialKind, assessment: { id: string; title?: string; questions: any[] }, answers: unknown) {
    const { result, questions } = reviewQuiz(assessment.questions, answers);
    const clean = Object.fromEntries(Object.entries((answers && typeof answers === 'object' ? answers : {}) as Record<string, unknown>).filter(([, v]) => typeof v === 'string' && v.length <= 2000).slice(0, 500)) as Record<string, string>;
    try {
      const now = new Date();
      const open = await this.repo.findOne({ where: { userId, kind, assessmentId: assessment.id, status: 'in_progress' } });
      const row = open ?? this.repo.create({ userId, kind, assessmentId: assessment.id, title: (assessment.title ?? '').slice(0, 255), startedAt: now });
      Object.assign(row, {
        status: 'submitted',
        answers: clean,
        score: result.score,
        correctCount: result.correctAnswers,
        gradableCount: result.gradableQuestions,
        totalQuestions: result.totalQuestions,
        graded: result.graded,
        review: { questions, topics: topicsOf(questions) },
        submittedAt: now,
      });
      const saved = await this.repo.save(row);
      if (result.graded) {
        await recordPerformance(this.ds.manager, { userId, assessmentType: kind, assessmentId: assessment.id, courseId: (assessment as { courseId?: string | null }).courseId ?? null, score: result.score, topics: questions.map((q) => q.topic), startedAt: saved.startedAt, submittedAt: now });
      }
      const late = !!saved.deadlineAt && now.getTime() > saved.deadlineAt.getTime() + DEADLINE_GRACE_MS;
      return { attemptId: saved.id, late };
    } catch (err) {
      if (isMissingTable(err)) return null;
      throw err;
    }
  }

  /** The learner's attempts (newest first), optionally for one kind / one assessment. No answer keys. */
  history(userId: string, kind?: OfficialKind, assessmentId?: string) {
    return withTable(FEATURE, async () => {
      const rows = await this.repo.find({ where: { userId, ...(kind ? { kind } : {}), ...(assessmentId ? { assessmentId } : {}) }, order: { startedAt: 'DESC' }, take: 200 });
      return rows.map((r) => ({ id: r.id, kind: r.kind, assessmentId: r.assessmentId, title: r.title, status: r.status, score: r.score, correctCount: r.correctCount, gradableCount: r.gradableCount, totalQuestions: r.totalQuestions, graded: r.graded, startedAt: r.startedAt, deadlineAt: r.deadlineAt, submittedAt: r.submittedAt }));
    });
  }

  /** One of the learner's own attempts; another learner's attempt is "not found". */
  attempt(userId: string, attemptId: string, kind?: OfficialKind) {
    return withTable(FEATURE, async () => {
      const r = await this.repo.findOne({ where: { id: attemptId, userId, ...(kind ? { kind } : {}) } });
      if (!r) throw new NotFoundException('Attempt not found.');
      return view(r);
    });
  }

  /** The learner's latest submitted attempt at this assessment, with its review. */
  results(userId: string, kind: OfficialKind, assessmentId: string) {
    return withTable(FEATURE, async () => {
      const r = await this.repo.findOne({ where: { userId, kind, assessmentId, status: 'submitted' }, order: { submittedAt: 'DESC' } });
      if (!r) throw new NotFoundException('No submitted attempt yet.');
      return view(r);
    });
  }

  /**
   * Exam readiness from the learner's own submitted attempts at this exam: counts, best/last/recent average, trend,
   * and topics under 70% across attempts. "not_started" with no attempts — nothing is estimated without data.
   */
  readiness(userId: string, examId: string) {
    return withTable(FEATURE, async () => {
      await this.assessment('exam', examId);
      const done = (await this.repo.find({ where: { userId, kind: 'exam', assessmentId: examId, status: 'submitted' }, order: { submittedAt: 'DESC' }, take: 50 })).filter((r) => r.graded && r.score !== null);
      if (!done.length) return { examId, status: 'not_started', attempts: 0, bestScore: null, lastScore: null, recentAverage: null, trend: null, weakTopics: [], readyAt: READY_SCORE };
      const scores = done.map((r) => Number(r.score));
      const recent = scores.slice(0, 3);
      const recentAverage = Math.round(recent.reduce((s, x) => s + x, 0) / recent.length);
      const trend = scores.length > 1 ? Math.round(scores[0] - scores[scores.length - 1]) : null;
      const topic = new Map<string, { correct: number; total: number }>();
      for (const r of done) for (const t of r.review?.topics ?? []) {
        const v = topic.get(t.topic) ?? { correct: 0, total: 0 };
        v.correct += t.correct;
        v.total += t.total;
        topic.set(t.topic, v);
      }
      const weakTopics = [...topic].map(([name, v]) => ({ topic: name, percent: Math.round((v.correct / v.total) * 100) })).filter((t) => t.percent < READY_SCORE).sort((a, b) => a.percent - b.percent);
      return {
        examId,
        status: recentAverage >= READY_SCORE && scores[0] >= READY_SCORE ? 'ready' : 'building',
        attempts: done.length,
        bestScore: Math.max(...scores),
        lastScore: scores[0],
        recentAverage,
        trend,
        weakTopics,
        readyAt: READY_SCORE,
      };
    });
  }
}


@Module({
  imports: [TypeOrmModule.forFeature([OfficialAssessmentAttempt])],
  providers: [OfficialAttemptsService],
  exports: [OfficialAttemptsService],
})
export class OfficialAttemptsModule {}
