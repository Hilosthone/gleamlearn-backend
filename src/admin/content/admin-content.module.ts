// src/admin/content/admin-content.module.ts
import { Module } from '@nestjs/common';
import { CoursesModule } from '../../courses/courses.module.js';
import { LessonsModule } from '../../lessons/lessons.module.js';
import { AdminContentController } from './admin-content.controller.js';
import { AdminContentService } from './admin-content.service.js';

/** Admin CRUD for the canonical learner catalog. Reuses CoursesService and LessonsService. */
@Module({
  imports: [CoursesModule, LessonsModule],
  controllers: [AdminContentController],
  providers: [AdminContentService],
})
export class AdminContentModule {}
