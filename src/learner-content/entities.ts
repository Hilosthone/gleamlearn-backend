import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/*
 * Learner-owned content. Tables added by docs/migrations/proposed/2026-10-27_learner_content.sql.
 * Every row belongs to exactly one learner (userId); none of it appears in the public catalogue.
 */

/** A private learning space a learner creates for themselves. Not a catalogue course; never published. */
@Entity('personal_courses')
export class PersonalCourse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_personal_courses_userId')
  @Column('uuid')
  userId: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  subjects: string[];

  @Column({ type: 'varchar', length: 100, nullable: true })
  level: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  examGoals: string[];

  /** Learning objectives / outline the learner wrote (2026-10-28 migration). */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  objectives: string[];

  /** Archived courses are hidden from the default list, never deleted. */
  @Column({ type: 'timestamptz', nullable: true })
  archivedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

/** A module/topic inside a personal course, with the learner's own notes and a done flag (progress). */
@Entity('personal_course_modules')
export class PersonalCourseModule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_personal_course_modules_courseId')
  @Column('uuid')
  courseId: string;

  @Column('uuid')
  userId: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'int', default: 0 })
  position: number;

  @Column({ type: 'boolean', default: false })
  isCompleted: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

/** A file a learner uploaded (PDF, DOCX, text). Stored privately; only its owner gets (short-lived) links. */
@Entity('learner_materials')
export class LearnerMaterial {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_learner_materials_userId')
  @Column('uuid')
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  personalCourseId: string | null;

  @Column({ type: 'varchar', length: 255 })
  originalName: string;

  @Column({ type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ type: 'int' })
  sizeBytes: number;

  /** Private storage key (driver-prefixed); never a public URL. NULL for pasted text (no file). */
  @Column({ type: 'varchar', length: 500, nullable: true })
  storageKey: string | null;

  /** 'upload' (a file) or 'text' (pasted). 2026-10-28 migration. */
  @Column({ type: 'varchar', length: 20, default: 'upload' })
  sourceType: string;

  /** PROCESSING (text being extracted), READY (text available), FAILED (see processingError). */
  @Column({ type: 'varchar', length: 20, default: 'READY' })
  status: string;

  /** Text extracted from the file (or the pasted text). Used for generation and search; never logged. */
  @Column({ type: 'text', nullable: true, select: false })
  extractedText: string | null;

  @Column({ type: 'int', default: 0 })
  textChars: number;

  /** Why extraction failed, in learner terms (e.g. a scanned PDF). */
  @Column({ type: 'text', nullable: true })
  processingError: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
