// src/notes/entities/note.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('notes')
export class NoteEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  userId: string; // Owner of the note

  @Column({ type: 'varchar', nullable: true })
  courseId: string; // Optional association with a course

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text' })
  content: string; // Markdown or rich text content

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}