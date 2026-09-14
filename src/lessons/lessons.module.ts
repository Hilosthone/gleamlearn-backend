// src/lessons/lessons.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonEntity } from './entities/lesson.entity.js';
import { LessonProgressEntity } from './entities/lesson-progress.entity.js';
import { LessonsService } from './lessons.service.js';
import { LessonsController } from './lessons.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([LessonEntity, LessonProgressEntity])],
  controllers: [LessonsController],
  providers: [LessonsService],
  exports: [LessonsService],
})
export class LessonsModule {}