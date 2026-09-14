// // src/files/files.controller.ts
// import { Controller, Get, Post, Delete, Param, Body, Query, UseInterceptors, UploadedFile, UploadedFiles } from '@nestjs/common';
// import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
// import { ApiTags, ApiOperation, ApiConsumes, ApiQuery, ApiBody } from '@nestjs/swagger';
// import { diskStorage } from 'multer';
// import type { Request } from 'express';
// import { extname } from 'path';
// import { FilesService } from './files.service.js';

// @ApiTags('File & PDF Upload')
// @Controller('api/v1/files')
// export class FilesController {
//   constructor(private readonly filesService: FilesService) {}

//   @Post('upload')
//   @ApiOperation({ summary: 'Upload a single course material file (PDF, DOCX, PPTX, TXT, Image)' })
//   @ApiConsumes('multipart/form-data')
//   @UseInterceptors(
//     FileInterceptor('file', {
//       storage: diskStorage({
//         destination: './uploads',
//         filename: (req: Request, file: Express.Multer.File, callback: (error: Error | null, filename: string) => void) => {
//           const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
//           callback(null, `${uniqueSuffix}${extname(file.originalname)}`);
//         },
//       }),
//     }),
//   )
//   uploadSingleFile(
//     @UploadedFile() file: Express.Multer.File,
//     @Body('title') title?: string,
//     @Body('category') category?: string,
//   ) {
//     return this.filesService.saveFileRecord(file, { title, category });
//   }

//   @Post('upload/multiple')
//   @ApiOperation({ summary: 'Upload multiple course material files simultaneously' })
//   @ApiConsumes('multipart/form-data')
//   @UseInterceptors(
//     FilesInterceptor('files', 10, {
//       storage: diskStorage({
//         destination: './uploads',
//         filename: (req: Request, file: Express.Multer.File, callback: (error: Error | null, filename: string) => void) => {
//           const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
//           callback(null, `${uniqueSuffix}${extname(file.originalname)}`);
//         },
//       }),
//     }),
//   )
//   async uploadMultipleFiles(
//     @UploadedFiles() files: Express.Multer.File[],
//     @Body('category') category?: string,
//   ) {
//     const savedRecords = [];
//     for (const file of files) {
//       const record = await this.filesService.saveFileRecord(file, { category });
//       savedRecords.push(record);
//     }
//     return savedRecords;
//   }

//   @Get()
//   @ApiOperation({ summary: 'Get all uploaded file records with optional status or MIME type filters' })
//   @ApiQuery({ name: 'status', required: false, description: 'Filter by processing status (PENDING, COMPLETED, FAILED)' })
//   @ApiQuery({ name: 'mimeType', required: false, description: 'Filter by MIME type (e.g. application/pdf)' })
//   findAllFiles(
//     @Query('status') status?: string,
//     @Query('mimeType') mimeType?: string,
//   ) {
//     return this.filesService.findAllFiles({ status, mimeType });
//   }

//   @Get(':id')
//   @ApiOperation({ summary: 'Get file metadata record by ID' })
//   findFileById(@Param('id') id: string) {
//     return this.filesService.findFileById(id);
//   }

//   @Delete(':id')
//   @ApiOperation({ summary: 'Delete a file record and storage artifact' })
//   deleteFile(@Param('id') id: string) {
//     return this.filesService.deleteFile(id);
//   }

//   @Get(':id/status')
//   @ApiOperation({ summary: 'Check background processing status of a file' })
//   getFileStatus(@Param('id') id: string) {
//     return this.filesService.getFileStatus(id);
//   }

//   @Post(':id/process')
//   @ApiOperation({ summary: 'Trigger asynchronous parsing and indexing for an uploaded file' })
//   processFile(@Param('id') id: string) {
//     return this.filesService.processFile(id);
//   }

//   @Post(':id/reprocess')
//   @ApiOperation({ summary: 'Reprocess a failed or updated file' })
//   reprocessFile(@Param('id') id: string) {
//     return this.filesService.reprocessFile(id);
//   }
// }


// src/files/files.controller.ts
import { Controller, Get, Post, Delete, Param, Body, Query, UseInterceptors, UploadedFile, UploadedFiles, UseGuards } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import type { Request } from 'express';
import { extname } from 'path';
import { FilesService } from './files.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('File & PDF Upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a single course material file (PDF, DOCX, PPTX, TXT, Image)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req: Request, file: Express.Multer.File, callback: (error: Error | null, filename: string) => void) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  uploadSingleFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title?: string,
    @Body('category') category?: string,
  ) {
    return this.filesService.saveFileRecord(file, { title, category });
  }

  @Post('upload/multiple')
  @ApiOperation({ summary: 'Upload multiple course material files simultaneously' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: './uploads',
        filename: (req: Request, file: Express.Multer.File, callback: (error: Error | null, filename: string) => void) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('category') category?: string,
  ) {
    const savedRecords = [];
    for (const file of files) {
      const record = await this.filesService.saveFileRecord(file, { category });
      savedRecords.push(record);
    }
    return savedRecords;
  }

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

  @Get(':id')
  @ApiOperation({ summary: 'Get file metadata record by ID' })
  findFileById(@Param('id') id: string) {
    return this.filesService.findFileById(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a file record and storage artifact' })
  deleteFile(@Param('id') id: string) {
    return this.filesService.deleteFile(id);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Check background processing status of a file' })
  getFileStatus(@Param('id') id: string) {
    return this.filesService.getFileStatus(id);
  }

  @Post(':id/process')
  @ApiOperation({ summary: 'Trigger asynchronous parsing and indexing for an uploaded file' })
  processFile(@Param('id') id: string) {
    return this.filesService.processFile(id);
  }

  @Post(':id/reprocess')
  @ApiOperation({ summary: 'Reprocess a failed or updated file' })
  reprocessFile(@Param('id') id: string) {
    return this.filesService.reprocessFile(id);
  }
}