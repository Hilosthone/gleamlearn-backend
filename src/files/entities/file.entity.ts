// // src/files/entities/file.entity.ts
// import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// @Entity('files')
// export class FileEntity {
//   @PrimaryGeneratedColumn('uuid')
//   id: string;

//   @Column({ type: 'varchar' })
//   originalName: string;

//   @Column({ type: 'varchar' })
//   filename: string;

//   @Column({ type: 'varchar' })
//   mimeType: string;

//   @Column({ type: 'int' })
//   size: number;

//   @Column({ type: 'varchar' })
//   url: string; // Storage URL (S3, Cloudinary, or local fallback path)

//   @Column({ type: 'varchar', default: 'PENDING' })
//   status: string; // 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

//   @Column({ type: 'text', nullable: true })
//   processingError: string;

//   @CreateDateColumn()
//   createdAt: Date;

//   @UpdateDateColumn()
//   updatedAt: Date;
// }


// src/files/entities/file.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('files')
export class FileEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  originalName: string;

  @Column({ type: 'varchar' })
  filename: string;

  @Column({ type: 'varchar' })
  mimeType: string;

  @Column({ type: 'int' })
  size: number;

  @Column({ type: 'varchar' })
  url: string;

  @Column({ type: 'varchar', default: 'PENDING' })
  status: string; // 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

  @Column({ type: 'text', nullable: true })
  processingError: string | null; // Allow null type

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}