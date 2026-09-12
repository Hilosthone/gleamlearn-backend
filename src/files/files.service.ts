// import { Injectable, NotFoundException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { FileEntity } from './entities/file.entity.js';

// @Injectable()
// export class FilesService {
//   constructor(
//     @InjectRepository(FileEntity) private fileRepo: Repository<FileEntity>,
//   ) {}

//   // Save uploaded file metadata to PostgreSQL
//   async saveFileRecord(file: Express.Multer.File) {
//     const fileRecord = this.fileRepo.create({
//       originalName: file.originalname,
//       filename: file.filename,
//       mimeType: file.mimetype,
//       size: file.size,
//       url: `/uploads/${file.filename}`, // Maps to static asset serve path
//       status: 'PENDING',
//     });
//     return this.fileRepo.save(fileRecord);
//   }

//   async findAllFiles() {
//     return this.fileRepo.find({ order: { createdAt: 'DESC' } });
//   }

//   async findFileById(id: string) {
//     const file = await this.fileRepo.findOne({ where: { id } });
//     if (!file) throw new NotFoundException('File record not found');
//     return file;
//   }

//   async deleteFile(id: string) {
//     const file = await this.findFileById(id);
//     await this.fileRepo.delete(id);
//     return { message: `File ${file.originalName} successfully deleted` };
//   }

//   async getFileStatus(id: string) {
//     const file = await this.findFileById(id);
//     return { id: file.id, status: file.status, error: file.processingError };
//   }

//   async processFile(id: string) {
//     const file = await this.findFileById(id);
    
//     // Simulate background processing job (e.g., parsing PDF/DOCX text, extracting pages/metadata)
//     file.status = 'PROCESSING';
//     await this.fileRepo.save(file);

//     try {
//       // Mock processing delay/logic
//       file.status = 'COMPLETED';
//       file.processingError = null;
//       await this.fileRepo.save(file);
//       return { message: 'File processed successfully', file };
//     } catch (error: any) {
//       file.status = 'FAILED';
//       file.processingError = error.message;
//       await this.fileRepo.save(file);
//       throw error;
//     }
//   }

//   async reprocessFile(id: string) {
//     return this.processFile(id);
//   }
// }


// src/files/files.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileEntity } from './entities/file.entity.js';

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(FileEntity) private fileRepo: Repository<FileEntity>,
  ) {}

  async saveFileRecord(file: Express.Multer.File, metadata?: { title?: string; category?: string }) {
    const fileRecord = this.fileRepo.create({
      originalName: metadata?.title || file.originalname,
      filename: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      url: `/uploads/${file.filename}`,
      status: 'PENDING',
    });
    return this.fileRepo.save(fileRecord);
  }

  async findAllFiles(filters?: { status?: string; mimeType?: string }) {
    const query = this.fileRepo.createQueryBuilder('file');

    if (filters?.status) {
      query.andWhere('file.status = :status', { status: filters.status });
    }
    if (filters?.mimeType) {
      query.andWhere('file.mimeType = :mimeType', { mimeType: filters.mimeType });
    }

    query.orderBy('file.createdAt', 'DESC');
    return query.getMany();
  }

  async findFileById(id: string) {
    const file = await this.fileRepo.findOne({ where: { id } });
    if (!file) throw new NotFoundException('File record not found');
    return file;
  }

  async deleteFile(id: string) {
    const file = await this.findFileById(id);
    await this.fileRepo.delete(id);
    return { message: `File ${file.originalName} successfully deleted` };
  }

  async getFileStatus(id: string) {
    const file = await this.findFileById(id);
    return { id: file.id, status: file.status, error: file.processingError };
  }

  async processFile(id: string) {
    const file = await this.findFileById(id);
    
    file.status = 'PROCESSING';
    await this.fileRepo.save(file);

    try {
      file.status = 'COMPLETED';
      file.processingError = null;
      await this.fileRepo.save(file);
      return { message: 'File processed successfully', file };
    } catch (error: any) {
      file.status = 'FAILED';
      file.processingError = error.message;
      await this.fileRepo.save(file);
      throw error;
    }
  }

  async reprocessFile(id: string) {
    return this.processFile(id);
  }
}