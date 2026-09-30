// src/admin/courses/courses.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoursesController } from './courses.controller.js';
import { CoursesService } from './courses.service.js';
import { AdminCourse } from './entities/admin-course.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([AdminCourse])],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class AdminCoursesModule {}