import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { withTable } from '../common/errors/missing-table.js';
import { AssessmentAttempt, LearnerAssessment } from './entities.js';
import { grade, learnerView, sanitiseAnswers } from './grading.js';
import { recordPerformance } from '../analytics/record-performance.js';

const FEATURE = 'Your quizzes and mock exams';
/** Answers saved this long after the deadline still count (network delay); later saves are refused. */
const DEADLINE_GRACE_MS = 30_000;

export interface AttemptSummary {
  id: string;
  assessmentId: string;
  status: 'in_progress' | 'submitted';
  score: number | null;
  correctCount: number | null;
  totalQuestions: number;
  startedAt: Date;
  deadlineAt: Date | null;
  submittedAt: Date | null;
  autoSubmitted: boolean;
}

const summary = (t: AssessmentAttempt): AttemptSummary => ({
  id: t.id,
  assessmentId: t.assessmentId,
  status: t.status,
  score: t.score,
  correctCount: t.correctCount,
  totalQuestions: t.totalQuestions,
  startedAt: t.startedAt,
  deadlineAt: t.deadlineAt,
  submittedAt: t.submittedAt,
  autoSubmitted: t.autoSubmitted,
});

/** attempts newest first */
function attemptSummary(mine: AssessmentAttempt[]) {
  const done = mine.filter((t) => t.status === 'submitted');
  return {
    attemptCount: done.length,
    bestScore: done.length ? Math.max(...done.map((t) => t.score ?? 0)) : null,
    lastScore: done[0]?.score ?? null,
    inProgressAttemptId: mine.find((t) => t.status === 'in_progress')?.id ?? null,
  };
}

@Injectable()
export class LearnerAssessmentsService {
  constructor(
    @InjectRepository(LearnerAssessment) private readonly assessments: Repository<LearnerAssessment>,
    @InjectRepository(AssessmentAttempt) private readonly attempts: Repository<AssessmentAttempt>,
  ) {}

  private async own(userId: string, id: string): Promise<LearnerAssessment> {
    const a = await this.assessments.findOne({ where: { id, userId } });
    if (!a) throw new NotFoundException('Quiz or exam not found.');
    return a;
  }

  private async ownAttempt(userId: string, attemptId: string): Promise<AssessmentAttempt> {
    const t = await this.attempts.findOne({ where: { id: attemptId, userId } });
    if (!t) throw new NotFoundException('Attempt not found.');
    return t;
  }

  /** The learner's quizzes / mock exams, newest first, with their attempt history summarised. */
  list(userId: string, kind?: 'quiz' | 'exam', personalCourseId?: string) {
    return withTable(FEATURE, async () => {
      const rows = await this.assessments.find({
        where: { userId, ...(kind ? { kind } : {}), ...(personalCourseId ? { personalCourseId } : {}) },
        order: { createdAt: 'DESC' },
        take: 200,
      });
      const attempts = rows.length ? await this.attempts.find({ where: { userId, assessmentId: In(rows.map((r) => r.id)) }, order: { startedAt: 'DESC' } }) : [];
      return rows.map((a) => {
        const { questions: _q, ...view } = learnerView(a);
        return { ...view, ...attemptSummary(attempts.filter((t) => t.assessmentId === a.id)) };
      });
    });
  }

  /** One quiz / mock exam (no answer key), with the same attempt summary as the list, so the page can offer "Resume". */
  get(userId: string, id: string) {
    return withTable(FEATURE, async () => {
      const a = await this.own(userId, id);
      const mine = await this.attempts.find({ where: { userId, assessmentId: a.id }, order: { startedAt: 'DESC' } });
      return { ...learnerView(a), ...attemptSummary(mine) };
    });
  }

  remove(userId: string, id: string) {
    return withTable(FEATURE, async () => {
      const a = await this.own(userId, id);
      await this.assessments.delete({ id: a.id, userId }); // attempts cascade
      return { deleted: true };
    });
  }

  /** Resumes the open attempt, or starts one. Two clicks at once still give one attempt (unique index). */
  start(userId: string, assessmentId: string) {
    return withTable(FEATURE, async () => {
      const a = await this.own(userId, assessmentId);
      const open = await this.attempts.findOne({ where: { userId, assessmentId, status: 'in_progress' } });
      if (open) return this.view(a, await this.expireIfPastDeadline(a, open));
      const now = new Date();
      try {
        const t = await this.attempts.save(
          this.attempts.create({
            userId,
            assessmentId,
            status: 'in_progress',
            answers: {},
            totalQuestions: a.questions.length,
            startedAt: now,
            deadlineAt: a.durationMinutes ? new Date(now.getTime() + a.durationMinutes * 60_000) : null,
          }),
        );
        return this.view(a, t);
      } catch (err) {
        if ((err as { driverError?: { code?: string } })?.driverError?.code !== '23505') throw err;
        const t = await this.attempts.findOne({ where: { userId, assessmentId, status: 'in_progress' } });
        if (!t) throw err;
        return this.view(a, t);
      }
    });
  }

  /** Autosave. In "immediate" mode the answered questions come back checked. */
  save(userId: string, attemptId: string, answers: unknown) {
    return withTable(FEATURE, async () => {
      let t = await this.ownAttempt(userId, attemptId);
      const a = await this.own(userId, t.assessmentId);
      t = await this.expireIfPastDeadline(a, t);
      if (t.status !== 'in_progress') throw new ConflictException('This attempt has already been submitted.');
      t.answers = { ...t.answers, ...sanitiseAnswers(a.questions, answers) };
      return this.view(a, await this.attempts.save(t));
    });
  }

  /** Grades on the server with the stored answer key. Submitting twice returns the same result. */
  submit(userId: string, attemptId: string, answers?: unknown) {
    return withTable(FEATURE, async () => {
      const t = await this.ownAttempt(userId, attemptId);
      const a = await this.own(userId, t.assessmentId);
      if (t.status === 'submitted') return this.view(a, t);
      const late = t.deadlineAt && Date.now() > t.deadlineAt.getTime() + DEADLINE_GRACE_MS;
      const final = late ? t.answers : { ...t.answers, ...sanitiseAnswers(a.questions, answers) };
      return this.view(a, await this.finish(a, t, final, !!late));
    });
  }

  attemptsFor(userId: string, assessmentId?: string) {
    return withTable(FEATURE, async () => {
      const rows = await this.attempts.find({ where: { userId, ...(assessmentId ? { assessmentId } : {}) }, order: { startedAt: 'DESC' }, take: 200 });
      const titles = rows.length ? await this.assessments.find({ where: { userId, id: In([...new Set(rows.map((r) => r.assessmentId))]) }, select: { id: true, title: true, kind: true } }) : [];
      return rows.map((r) => ({ ...summary(r), title: titles.find((x) => x.id === r.assessmentId)?.title ?? '', kind: titles.find((x) => x.id === r.assessmentId)?.kind ?? null }));
    });
  }

  attempt(userId: string, attemptId: string) {
    return withTable(FEATURE, async () => {
      let t = await this.ownAttempt(userId, attemptId);
      const a = await this.own(userId, t.assessmentId);
      t = await this.expireIfPastDeadline(a, t);
      return this.view(a, t);
    });
  }

  private async finish(a: LearnerAssessment, t: AssessmentAttempt, answers: Record<string, string>, autoSubmitted: boolean) {
    const result = grade(a.questions, answers);
    t.answers = answers;
    t.status = 'submitted';
    t.score = result.score;
    t.correctCount = result.correctCount;
    t.review = result.review;
    t.submittedAt = new Date();
    t.autoSubmitted = autoSubmitted;
    // conditional on still being in progress, so a concurrent submit cannot grade it twice
    const res = await this.attempts.update(
      { id: t.id, userId: t.userId, status: 'in_progress' },
      { answers: t.answers, status: t.status, score: t.score, correctCount: t.correctCount, review: t.review as never, submittedAt: t.submittedAt, autoSubmitted: t.autoSubmitted },
    );
    if (!res.affected) {
      // submitted concurrently by another request: return that one
      const done = await this.attempts.findOne({ where: { id: t.id, userId: t.userId } });
      if (done) return done;
    }
    // this learner's analytics (never fails the submission)
    await recordPerformance(this.attempts.manager, { userId: t.userId, assessmentType: a.kind, assessmentId: a.id, courseId: a.personalCourseId, score: t.score ?? 0, topics: (result.review.topics ?? []).map((x) => x.topic), startedAt: t.startedAt, submittedAt: t.submittedAt });
    return t;
  }

  /** A timed attempt past its deadline is submitted with the answers saved in time. */
  private async expireIfPastDeadline(a: LearnerAssessment, t: AssessmentAttempt) {
    if (t.status === 'in_progress' && t.deadlineAt && Date.now() > t.deadlineAt.getTime() + DEADLINE_GRACE_MS) {
      return this.finish(a, t, t.answers, true);
    }
    return t;
  }

  private view(a: LearnerAssessment, t: AssessmentAttempt) {
    const base = { attempt: summary(t), assessment: learnerView(a), answers: t.answers };
    if (t.status === 'submitted') return { ...base, review: t.review };
    if (a.feedbackMode === 'immediate') {
      // practice mode: each answered question is checked straight away
      const checked = Object.keys(t.answers).map((k) => {
        const q = a.questions[Number(k)];
        return { index: Number(k), correct: t.answers[k] === q.answer, answer: q.answer, explanation: q.explanation };
      });
      return { ...base, checked };
    }
    return base;
  }

  /** Throws when the answers object is not a plain object (used by the controller). */
  static assertAnswers(value: unknown) {
    if (value !== undefined && (value === null || typeof value !== 'object' || Array.isArray(value))) {
      throw new BadRequestException('answers must be an object of { questionIndex: option }.');
    }
  }
}
