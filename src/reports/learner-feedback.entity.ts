import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * A learner's rating and message from Help & Support (database/migrations/20261029090000_learner_feedback.sql).
 * Replaces the Prisma "feedback" model, which never had a table.
 */
@Entity('learner_feedback')
@Index('IDX_learner_feedback_created', ['createdAt'])
export class LearnerFeedback {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) userId: string;
  @Column({ type: 'smallint' }) rating: number;
  @Column({ type: 'text' }) message: string;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
