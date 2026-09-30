// src/admin/courses/courses.controller.ts
import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { CoursesService } from './courses.service.js';
import { CreateAdminCourseDto } from './dto/create-admin-course.dto.js';
import { UpdateAdminCourseDto } from './dto/update-admin-course.dto.js';
import { AdminCoursesQueryDto } from './dto/admin-courses-query.dto.js';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt.guard.js';

@ApiTags('Admin Course Management')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('api/v1/admin/courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  @ApiOperation({ summary: 'List all courses with pagination and search' })
  @ApiResponse({ status: 200, description: 'Courses retrieved successfully.' })
  findAll(@Query() query: AdminCoursesQueryDto) {
    return this.coursesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific course by ID' })
  @ApiResponse({ status: 200, description: 'Course retrieved successfully.' })
  findOne(@Param('id') id: string) {
    return this.coursesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new course' })
  @ApiResponse({ status: 201, description: 'Course created successfully.' })
  create(@Body() dto: CreateAdminCourseDto) {
    return this.coursesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing course' })
  @ApiResponse({ status: 200, description: 'Course updated successfully.' })
  update(@Param('id') id: string, @Body() dto: UpdateAdminCourseDto) {
    return this.coursesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Permanently delete a course' })
  @ApiResponse({ status: 200, description: 'Course deleted successfully.' })
  remove(@Param('id') id: string) {
    return this.coursesService.remove(id);
  }

  @Patch(':id/publish')
  @ApiOperation({ summary: 'Publish a course' })
  @ApiResponse({ status: 200, description: 'Course published successfully.' })
  publish(@Param('id') id: string) {
    return this.coursesService.publish(id);
  }

  @Patch(':id/unpublish')
  @ApiOperation({ summary: 'Unpublish a course' })
  @ApiResponse({ status: 200, description: 'Course unpublished successfully.' })
  unpublish(@Param('id') id: string) {
    return this.coursesService.unpublish(id);
  }
}