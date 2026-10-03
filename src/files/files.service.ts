// src/files/files.service.ts
import { Injectable, Inject, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v2 as cloudinary } from 'cloudinary';
import { CLOUDINARY } from './cloudinary.provider.js';
import { FileEntity } from './entities/file.entity.js';
import { Readable } from 'stream'; 

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(FileEntity) private fileRepo: Repository<FileEntity>,
    @Inject(CLOUDINARY) private readonly cloudinaryClient: typeof cloudinary,
  ) {}

  async saveFileRecord(file: any, metadata?: { title?: string; category?: string }): Promise<FileEntity> {
    if (!file) {
      throw new InternalServerErrorException('No file provided for upload.');
    }

    return new Promise((resolve, reject) => {
      const uploadStream = this.cloudinaryClient.uploader.upload_stream(
        {
          folder: 'gleamlearn-files',
          resource_type: 'auto',
        },
        async (error, result) => {
          if (error || !result) {
            return reject(new InternalServerErrorException(`Cloudinary upload failed: ${error?.message || 'Unknown error'}`));
          }
          
          try {
            const fileRecord = this.fileRepo.create({
              originalName: metadata?.title || file.originalname,
              filename: result.public_id,
              mimeType: file.mimetype,
              size: file.size,
              url: result.secure_url,
              status: 'PENDING',
              processingError: null,
            } as any);

            const savedRecord = await this.fileRepo.save(fileRecord as any);
            resolve(savedRecord);
          } catch (dbError: any) {
            reject(new InternalServerErrorException(`Failed to save file records: ${dbError.message}`));
          }
        },
      );

      // Stream the buffer directly to Cloudinary using native Node.js Readable stream
      Readable.from(file.buffer).pipe(uploadStream);
    });
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
    
    try {
      await this.cloudinaryClient.uploader.destroy(file.filename);
    } catch (e) {
      // Non-blocking if asset is already missing
    }

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