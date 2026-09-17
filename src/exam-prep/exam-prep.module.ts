// src/exam-prep/exam-prep.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Examination } from './entities/examination.entity.js';
import { PastQuestion } from './entities/past-question.entity.js';
import { ExamPrep } from './entities/exam-prep.entity.js';
import { ExamPrepService } from './exam-prep.service.js';
import { ExamPrepController } from './exam-prep.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Examination, PastQuestion, ExamPrep])],
  controllers: [ExamPrepController],
  providers: [ExamPrepService],
  exports: [ExamPrepService],
})
export class ExamPrepModule {}