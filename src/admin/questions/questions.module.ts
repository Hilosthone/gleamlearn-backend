// src/admin/questions/questions.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionsController } from './questions.controller.js';
import { QuestionsService } from './questions.service.js';
import { AdminQuestion } from './entities/admin-question.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([AdminQuestion])],
  controllers: [QuestionsController],
  providers: [QuestionsService],
  exports: [QuestionsService],
})
export class AdminQuestionsModule {}