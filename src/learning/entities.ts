import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/*
 * Self-service learning. Tables added by docs/migrations/proposed/2026-10-28_self_service_learning.sql.
 * Every row belongs to one learner (userId); links point at that learner's own course / material / session.
 */

export const TEXT_RESOURCE_KINDS = ['lesson', 'summary', 'notes', 'study_plan', 'key_concepts', 'explanation'] as const;
export type TextResourceKind = (typeof TEXT_RESOURCE_KINDS)[number];
/** 'topic': a short topic the learner names, taught from general knowledge (visual lessons). */
export const SOURCE_TYPES = ['material', 'text', 'course', 'module', 'resource', 'youtube', 'note', 'topic'] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

/** A generated lesson, summary, notes, study plan, key concepts or explanation. */
@Entity('learning_resources')
export class LearningResource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  /** Client-chosen id for the request: a retried or double-clicked generation returns the same row. */
  @Column({ type: 'uuid', nullable: true })
  requestId: string | null;

  /** A text kind, or 'flashcards' / 'course_plan' (records of what was created: a deck, or course modules). */
  @Column({ type: 'varchar', length: 30 })
  /** visual_lesson: content is the validated JSON lesson (src/learning/visual-lesson.ts) */
  kind: TextResourceKind | 'flashcards' | 'course_plan' | 'visual_lesson';

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 20 })
  sourceType: SourceType;

  @Column({ type: 'uuid', nullable: true })
  materialId: string | null;

  @Column({ type: 'uuid', nullable: true })
  personalCourseId: string | null;

  @Column({ type: 'uuid', nullable: true })
  moduleId: string | null;

  @Column({ type: 'uuid', nullable: true })
  youtubeSessionId: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  options: Record<string, unknown>;

  /** The source was longer than the AI could read; only the first part was used. */
  @Column({ type: 'boolean', default: false })
  truncated: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

export interface StoredQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  topic: string;
}

/** A learner-generated quiz or mock exam. The answer key stays here; learners get it only in a review. */
@Entity('learner_assessments')
export class LearnerAssessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  requestId: string | null;

  @Column({ type: 'varchar', length: 10 })
  kind: 'quiz' | 'exam';

  @Column({ type: 'varchar', length: 255 })
  title: string;

  /** e.g. WAEC, JAMB, Post-UTME, or a university course — what the learner is preparing for. */
  @Column({ type: 'varchar', length: 60, nullable: true })
  examType: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  difficulty: string | null;

  @Column({ type: 'int', nullable: true })
  durationMinutes: number | null;

  /** 'after_submit' (exam style) or 'immediate' (practice: each answer is checked as it is given). */
  @Column({ type: 'varchar', length: 20, default: 'after_submit' })
  feedbackMode: 'after_submit' | 'immediate';

  @Column({ type: 'jsonb' })
  questions: StoredQuestion[];

  @Column({ type: 'varchar', length: 20 })
  sourceType: SourceType;

  @Column({ type: 'uuid', nullable: true })
  materialId: string | null;

  @Column({ type: 'uuid', nullable: true })
  personalCourseId: string | null;

  @Column({ type: 'uuid', nullable: true })
  moduleId: string | null;

  @Column({ type: 'uuid', nullable: true })
  resourceId: string | null;

  @Column({ type: 'uuid', nullable: true })
  youtubeSessionId: string | null;

  @Column({ type: 'int' })
  requestedCount: number;

  @Column({ type: 'boolean', default: false })
  truncated: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

export interface QuestionReview {
  index: number;
  question: string;
  options: string[];
  chosen: string | null;
  answer: string;
  correct: boolean;
  explanation: string;
  topic: string;
}

export interface AttemptReview {
  questions: QuestionReview[];
  topics: { topic: string; correct: number; total: number; percent: number }[];
  strengths: string[];
  toRevise: string[];
}

/** One attempt at a learner assessment. At most one in progress per learner and assessment (partial unique index). */
@Entity('assessment_attempts')
export class AssessmentAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  assessmentId: string;

  @Column({ type: 'varchar', length: 15, default: 'in_progress' })
  status: 'in_progress' | 'submitted';

  /** { "<question index>": "<chosen option text>" } */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  answers: Record<string, string>;

  @Column({ type: 'int', nullable: true })
  score: number | null;

  @Column({ type: 'int', nullable: true })
  correctCount: number | null;

  @Column({ type: 'int' })
  totalQuestions: number;

  @Column({ type: 'jsonb', nullable: true })
  review: AttemptReview | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  startedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  deadlineAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @Column({ type: 'boolean', default: false })
  autoSubmitted: boolean;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

/** A question asked in a YouTube learning session, and the grounded answer (with verified timestamps). */
@Entity('youtube_session_messages')
export class YoutubeSessionMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  sessionId: string;

  @Column('uuid')
  userId: string;

  @Column({ type: 'varchar', length: 10 })
  role: 'user' | 'assistant';

  @Column({ type: 'text' })
  content: string;

  /** Seconds into the video that the answer cites; only timestamps that exist in the transcript. */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  citations: number[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
