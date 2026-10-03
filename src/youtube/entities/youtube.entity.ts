// src/youtube/entities/youtube.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('youtube_resources')
export class YoutubeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  videoUrl: string;

  @Column()
  videoId: string;

  @Column({ nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  channelTitle: string;

  @Column({ type: 'text', nullable: true })
  thumbnailUrl: string;

  @Column({ type: 'text', nullable: true })
  rawTranscript: string;

  @Column({ type: 'jsonb', nullable: true })
  structuredMaterial: any; // AI processed course notes & summaries

  @Column({ default: 'PENDING' })
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

  @Column({ type: 'text', nullable: true })
  processingError: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}