// src/exams/exams.module.ts
import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exam } from './entities/exam.entity.js';
import { ExamsService } from './exams.service.js';
import { ExamsController } from './exams.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Exam]), FilesModule],
  controllers: [ExamsController],
  providers: [ExamsService],
  exports: [ExamsService],
})
export class ExamsModule {}