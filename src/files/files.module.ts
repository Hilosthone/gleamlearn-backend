// import { Module } from '@nestjs/common';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { FileEntity } from './entities/file.entity.js';
// import { FilesService } from './files.service.js';
// import { FilesController } from './files.controller.js';

// @Module({
//   imports: [TypeOrmModule.forFeature([FileEntity])],
//   controllers: [FilesController],
//   providers: [FilesService],
//   exports: [FilesService],
// })
// export class FilesModule {}


// src/files/files.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { FileEntity } from './entities/file.entity.js';
import { FilesService } from './files.service.js';
import { FilesController } from './files.controller.js';
import { CloudinaryProvider } from './cloudinary.provider.js';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([FileEntity]),
  ],
  controllers: [FilesController],
  providers: [FilesService, CloudinaryProvider],
  exports: [FilesService, CloudinaryProvider],
})
export class FilesModule {}