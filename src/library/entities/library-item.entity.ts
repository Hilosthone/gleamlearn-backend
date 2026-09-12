import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Unique } from 'typeorm';
import type { User } from '../../auth/entities/user.entity.js';

@Entity('library_saved_courses')
@Unique(['userId', 'courseId'])
export class LibraryCourse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  user: User;

  @Column()
  courseId: string;

  @CreateDateColumn()
  savedAt: Date;
}

@Entity('library_favorites')
@Unique(['userId', 'referenceId'])
export class LibraryFavorite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  user: User;

  @Column()
  referenceId: string; // ID of topic, material, quiz, test, or exam

  @Column({ type: 'varchar' })
  type: string; // 'TOPIC' | 'MATERIAL' | 'QUIZ' | 'TEST' | 'EXAM'

  @CreateDateColumn()
  favoritedAt: Date;
}