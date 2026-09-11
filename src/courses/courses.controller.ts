// src/courses/courses.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CoursesService } from './courses.service.js';
import { CreateCourseDto, UpdateCourseDto, CreateTopicDto, UpdateTopicDto } from './dto/course.dto.js';

@ApiTags('Courses, Topics & Enrollments')
@Controller('api/v1')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  // Course Search (Put before :id route to prevent collision)
  @Get('courses/search')
  @ApiOperation({ summary: 'Search courses by query string, track, or level' })
  searchCourses(@Query('q') q: string = '', @Query('track') track?: string, @Query('level') level?: string) {
    return this.coursesService.searchCourses(q, track, level);
  }

  // Enrolled courses for current user (Mock placeholder user ID until full Guard integration)
  @Get('users/me/courses')
  @ApiOperation({ summary: 'Get current user enrolled courses' })
  getUserEnrolledCourses() {
    return this.coursesService.findUserEnrolledCourses('current-user-id-placeholder');
  }

  // Courses CRUD
  @Get('courses')
  findAllCourses() {
    return this.coursesService.findAllCourses();
  }

  @Post('courses')
  createCourse(@Body() dto: CreateCourseDto) {
    return this.coursesService.createCourse(dto);
  }

  @Get('courses/:id')
  findCourseById(@Param('id') id: string) {
    return this.coursesService.findCourseById(id);
  }

  @Patch('courses/:id')
  updateCourse(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.coursesService.updateCourse(id, dto);
  }

  @Delete('courses/:id')
  deleteCourse(@Param('id') id: string) {
    return this.coursesService.deleteCourse(id);
  }

  // Topics
  @Get('courses/:courseId/topics')
  findTopicsByCourse(@Param('courseId') courseId: string) {
    return this.coursesService.findTopicsByCourse(courseId);
  }

  @Post('courses/:courseId/topics')
  createTopic(@Param('courseId') courseId: string, @Body() dto: CreateTopicDto) {
    return this.coursesService.createTopic(courseId, dto);
  }

  @Get('topics/:id')
  findTopicById(@Param('id') id: string) {
    return this.coursesService.findTopicById(id);
  }

  @Patch('topics/:id')
  updateTopic(@Param('id') id: string, @Body() dto: UpdateTopicDto) {
    return this.coursesService.updateTopic(id, dto);
  }

  @Delete('topics/:id')
  deleteTopic(@Param('id') id: string) {
    return this.coursesService.deleteTopic(id);
  }

  // Enrollments
  @Post('courses/:courseId/enroll')
  enrollUser(@Param('courseId') courseId: string) {
    return this.coursesService.enrollUser('current-user-id-placeholder', courseId);
  }

  @Delete('courses/:courseId/enroll')
  unenrollUser(@Param('courseId') courseId: string) {
    return this.coursesService.unenrollUser('current-user-id-placeholder', courseId);
  }
}