// src/admin/content/admin-content.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt.guard.js';
import { AdminPermission, RequireAdminPermission } from '../auth/admin-permissions.js';
import { AdminContentService } from './admin-content.service.js';
import {
  AdminContentQueryDto,
  AdminCreateCourseDto,
  AdminCreateLessonDto,
  AdminCreateTopicDto,
  AdminUpdateCourseDto,
  AdminUpdateLessonDto,
  AdminUpdateTopicDto,
} from './dto/admin-content.dto.js';

/** Admin management of the learner-facing catalog (courses, topics, lessons). Requires content.manage. */
@ApiTags('Admin - Learning Content')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@RequireAdminPermission(AdminPermission.CONTENT_MANAGE)
@Controller('api/v1/admin/content')
export class AdminContentController {
  constructor(private readonly content: AdminContentService) {}

  @Get('courses')
  @ApiOperation({ summary: 'List learner catalog courses with topic, lesson and enrollment counts' })
  listCourses(@Query() query: AdminContentQueryDto) {
    return this.content.listCourses(query);
  }

  @Post('courses')
  createCourse(@Body() dto: AdminCreateCourseDto) {
    return this.content.createCourse(dto);
  }

  @Get('courses/:id')
  getCourse(@Param('id') id: string) {
    return this.content.getCourse(id);
  }

  @Patch('courses/:id')
  updateCourse(@Param('id') id: string, @Body() dto: AdminUpdateCourseDto) {
    return this.content.updateCourse(id, dto);
  }

  @Delete('courses/:id')
  @ApiOperation({ summary: 'Delete an EMPTY course (409 if it has topics, lessons or enrollments)' })
  deleteCourse(@Param('id') id: string) {
    return this.content.deleteCourse(id);
  }

  @Post('courses/:id/topics')
  createTopic(@Param('id') courseId: string, @Body() dto: AdminCreateTopicDto) {
    return this.content.createTopic(courseId, dto);
  }

  @Patch('topics/:id')
  updateTopic(@Param('id') id: string, @Body() dto: AdminUpdateTopicDto) {
    return this.content.updateTopic(id, dto);
  }

  @Delete('topics/:id')
  deleteTopic(@Param('id') id: string) {
    return this.content.deleteTopic(id);
  }

  @Post('courses/:id/lessons')
  createLesson(@Param('id') courseId: string, @Body() dto: AdminCreateLessonDto) {
    return this.content.createLesson(courseId, dto);
  }

  @Patch('lessons/:id')
  updateLesson(@Param('id') id: string, @Body() dto: AdminUpdateLessonDto) {
    return this.content.updateLesson(id, dto);
  }

  @Delete('lessons/:id')
  deleteLesson(@Param('id') id: string) {
    return this.content.deleteLesson(id);
  }
}
