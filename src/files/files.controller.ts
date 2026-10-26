// src/files/files.controller.ts
import { Controller, Get, Post, Delete, Param, Body, Query, UseInterceptors, UploadedFile, UploadedFiles, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { FilesService } from './files.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AdminOnly } from '../admin/auth/admin-only.decorator.js';
import { AdminPermission } from '../admin/auth/admin-permissions.js';

@ApiTags('File & PDF Upload')
@ApiBearerAuth()
@Controller('api/v1/files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 10, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @ApiOperation({ summary: 'Upload a single course material file (PDF, DOCX, PPTX, TXT, Image)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file'), // Defaults cleanly to memory buffering
  )
  uploadSingleFile(
    @UploadedFile() file: any,
    @Body('title') title?: string,
    @Body('category') category?: string,
  ) {
    return this.filesService.saveFileRecord(file, { title, category });
  }

  @Throttle({ short: { limit: 1, ttl: 5000 }, long: { limit: 5, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  @Post('upload/multiple')
  @ApiOperation({ summary: 'Upload multiple course material files simultaneously' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('files', 10), // Defaults cleanly to memory buffering
  )
  async uploadMultipleFiles(
    @UploadedFiles() files: any[],
    @Body('category') category?: string,
  ) {
    const savedRecords = [];
    for (const file of files) {
      const record = await this.filesService.saveFileRecord(file, { category });
      savedRecords.push(record);
    }
    return savedRecords;
  }

  // Files have no owner column yet (B4): listing them all would show every learner's uploads
  @AdminOnly(AdminPermission.CONTENT_MANAGE)
  @Get()
  @ApiOperation({ summary: 'Get all uploaded file records with optional status or MIME type filters' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by processing status (PENDING, COMPLETED, FAILED)' })
  @ApiQuery({ name: 'mimeType', required: false, description: 'Filter by MIME type (e.g. application/pdf)' })
  findAllFiles(
    @Query('status') status?: string,
    @Query('mimeType') mimeType?: string,
  ) {
    return this.filesService.findAllFiles({ status, mimeType });
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get file metadata record by ID' })
  findFileById(@Param('id') id: string) {
    return this.filesService.findFileById(id);
  }

  // Files have no owner column yet (B4): any learner could delete anyone's upload
  @AdminOnly(AdminPermission.CONTENT_MANAGE)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a file record and storage artifact' })
  deleteFile(@Param('id') id: string) {
    return this.filesService.deleteFile(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/status')
  @ApiOperation({ summary: 'Check background processing status of a file' })
  getFileStatus(@Param('id') id: string) {
    return this.filesService.getFileStatus(id);
  }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 10, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  @Post(':id/process')
  @ApiOperation({ summary: 'Trigger asynchronous parsing and indexing for an uploaded file' })
  processFile(@Param('id') id: string) {
    return this.filesService.processFile(id);
  }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 10, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  @Post(':id/reprocess')
  @ApiOperation({ summary: 'Reprocess a failed or updated file' })
  reprocessFile(@Param('id') id: string) {
    return this.filesService.reprocessFile(id);
  }
}