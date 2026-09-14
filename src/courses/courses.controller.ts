// // src/courses/courses.controller.ts
// import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
// import { ApiTags, ApiOperation } from '@nestjs/swagger';
// import { CoursesService } from './courses.service.js';
// import { CreateCourseDto, UpdateCourseDto, CreateTopicDto, UpdateTopicDto } from './dto/course.dto.js';

// @ApiTags('Courses, Topics & Enrollments')
// @Controller('api/v1')
// export class CoursesController {
//   constructor(private readonly coursesService: CoursesService) {}

//   // Course Search (Put before :id route to prevent collision)
//   @Get('courses/search')
//   @ApiOperation({ summary: 'Search courses by query string, track, or level' })
//   searchCourses(@Query('q') q: string = '', @Query('track') track?: string, @Query('level') level?: string) {
//     return this.coursesService.searchCourses(q, track, level);
//   }

//   // Enrolled courses for current user (Mock placeholder user ID until full Guard integration)
//   @Get('users/me/courses')
//   @ApiOperation({ summary: 'Get current user enrolled courses' })
//   getUserEnrolledCourses() {
//     return this.coursesService.findUserEnrolledCourses('current-user-id-placeholder');
//   }

//   // Courses CRUD
//   @Get('courses')
//   findAllCourses() {
//     return this.coursesService.findAllCourses();
//   }

//   @Post('courses')
//   createCourse(@Body() dto: CreateCourseDto) {
//     return this.coursesService.createCourse(dto);
//   }

//   @Get('courses/:id')
//   findCourseById(@Param('id') id: string) {
//     return this.coursesService.findCourseById(id);
//   }

//   @Patch('courses/:id')
//   updateCourse(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
//     return this.coursesService.updateCourse(id, dto);
//   }

//   @Delete('courses/:id')
//   deleteCourse(@Param('id') id: string) {
//     return this.coursesService.deleteCourse(id);
//   }

//   // Topics
//   @Get('courses/:courseId/topics')
//   findTopicsByCourse(@Param('courseId') courseId: string) {
//     return this.coursesService.findTopicsByCourse(courseId);
//   }

//   @Post('courses/:courseId/topics')
//   createTopic(@Param('courseId') courseId: string, @Body() dto: CreateTopicDto) {
//     return this.coursesService.createTopic(courseId, dto);
//   }

//   @Get('topics/:id')
//   findTopicById(@Param('id') id: string) {
//     return this.coursesService.findTopicById(id);
//   }

//   @Patch('topics/:id')
//   updateTopic(@Param('id') id: string, @Body() dto: UpdateTopicDto) {
//     return this.coursesService.updateTopic(id, dto);
//   }

//   @Delete('topics/:id')
//   deleteTopic(@Param('id') id: string) {
//     return this.coursesService.deleteTopic(id);
//   }

//   // Enrollments
//   @Post('courses/:courseId/enroll')
//   enrollUser(@Param('courseId') courseId: string) {
//     return this.coursesService.enrollUser('current-user-id-placeholder', courseId);
//   }

//   @Delete('courses/:courseId/enroll')
//   unenrollUser(@Param('courseId') courseId: string) {
//     return this.coursesService.unenrollUser('current-user-id-placeholder', courseId);
//   }
// }


// src/courses/courses.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CoursesService } from './courses.service.js';
import { CreateCourseDto, UpdateCourseDto, CreateTopicDto, UpdateTopicDto } from './dto/course.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('Courses, Topics & Enrollments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  // Course Search (Put before :id route to prevent collision)
  @Get('courses/search')
  @ApiOperation({ summary: 'Search courses by query string, track, or level' })
  @ApiResponse({ status: 200, description: 'List of matching courses retrieved.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  searchCourses(@Query('q') q: string = '', @Query('track') track?: string, @Query('level') level?: string) {
    return this.coursesService.searchCourses(q, track, level);
  }

  // Enrolled courses for current user
  @Get('users/me/courses')
  @ApiOperation({ summary: 'Get current user enrolled courses' })
  @ApiResponse({ status: 200, description: 'List of enrolled courses retrieved.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getUserEnrolledCourses(@CurrentUser('id') userId: string) {
    return this.coursesService.findUserEnrolledCourses(userId);
  }

  // Courses CRUD
  @Get('courses')
  @ApiOperation({ summary: 'Retrieve all available courses' })
  @ApiResponse({ status: 200, description: 'List of all courses retrieved.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findAllCourses() {
    return this.coursesService.findAllCourses();
  }

  @Post('courses')
  @ApiOperation({ summary: 'Create a new course' })
  @ApiResponse({ status: 201, description: 'Course created successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  createCourse(@Body() dto: CreateCourseDto) {
    return this.coursesService.createCourse(dto);
  }

  @Get('courses/:id')
  @ApiOperation({ summary: 'Get a specific course by ID' })
  @ApiResponse({ status: 200, description: 'Course found.' })
  @ApiResponse({ status: 404, description: 'Course not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findCourseById(@Param('id') id: string) {
    return this.coursesService.findCourseById(id);
  }

  @Patch('courses/:id')
  @ApiOperation({ summary: 'Update an existing course' })
  @ApiResponse({ status: 200, description: 'Course updated successfully.' })
  @ApiResponse({ status: 404, description: 'Course not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  updateCourse(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.coursesService.updateCourse(id, dto);
  }

  @Delete('courses/:id')
  @ApiOperation({ summary: 'Delete a course' })
  @ApiResponse({ status: 200, description: 'Course deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Course not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  deleteCourse(@Param('id') id: string) {
    return this.coursesService.deleteCourse(id);
  }

  // Topics
  @Get('courses/:courseId/topics')
  @ApiOperation({ summary: 'Get all topics belonging to a specific course' })
  @ApiResponse({ status: 200, description: 'List of topics retrieved.' })
  @ApiResponse({ status: 404, description: 'Course not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findTopicsByCourse(@Param('courseId') courseId: string) {
    return this.coursesService.findTopicsByCourse(courseId);
  }

  @Post('courses/:courseId/topics')
  @ApiOperation({ summary: 'Create a new topic within a course' })
  @ApiResponse({ status: 201, description: 'Topic created successfully.' })
  @ApiResponse({ status: 404, description: 'Course not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  createTopic(@Param('courseId') courseId: string, @Body() dto: CreateTopicDto) {
    return this.coursesService.createTopic(courseId, dto);
  }

  @Get('topics/:id')
  @ApiOperation({ summary: 'Get a specific topic by ID' })
  @ApiResponse({ status: 200, description: 'Topic found.' })
  @ApiResponse({ status: 404, description: 'Topic not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findTopicById(@Param('id') id: string) {
    return this.coursesService.findTopicById(id);
  }

  @Patch('topics/:id')
  @ApiOperation({ summary: 'Update an existing topic' })
  @ApiResponse({ status: 200, description: 'Topic updated successfully.' })
  @ApiResponse({ status: 404, description: 'Topic not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  updateTopic(@Param('id') id: string, @Body() dto: UpdateTopicDto) {
    return this.coursesService.updateTopic(id, dto);
  }

  @Delete('topics/:id')
  @ApiOperation({ summary: 'Delete a topic' })
  @ApiResponse({ status: 200, description: 'Topic deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Topic not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  deleteTopic(@Param('id') id: string) {
    return this.coursesService.deleteTopic(id);
  }

  // Enrollments
  @Post('courses/:courseId/enroll')
  @ApiOperation({ summary: 'Enroll the authenticated user in a course' })
  @ApiResponse({ status: 201, description: 'Successfully enrolled in course.' })
  @ApiResponse({ status: 404, description: 'Course not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  enrollUser(@CurrentUser('id') userId: string, @Param('courseId') courseId: string) {
    return this.coursesService.enrollUser(userId, courseId);
  }

  @Delete('courses/:courseId/enroll')
  @ApiOperation({ summary: 'Unenroll the authenticated user from a course' })
  @ApiResponse({ status: 200, description: 'Successfully unenrolled from course.' })
  @ApiResponse({ status: 404, description: 'Course or enrollment not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  unenrollUser(@CurrentUser('id') userId: string, @Param('courseId') courseId: string) {
    return this.coursesService.unenrollUser(userId, courseId);
  }
}