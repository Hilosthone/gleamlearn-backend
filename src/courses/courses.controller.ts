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


// // src/courses/courses.controller.ts
// import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
// import { CoursesService } from './courses.service.js';
// import { CreateCourseDto, UpdateCourseDto, CreateTopicDto, UpdateTopicDto } from './dto/course.dto.js';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
// import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

// @ApiTags('Courses, Topics & Enrollments')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
// @Controller('api/v1')
// export class CoursesController {
//   constructor(private readonly coursesService: CoursesService) {}

//   // Course Search (Put before :id route to prevent collision)
//   @Get('courses/search')
//   @ApiOperation({ summary: 'Search courses by query string, track, or level' })
//   @ApiResponse({ status: 200, description: 'List of matching courses retrieved.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   searchCourses(@Query('q') q: string = '', @Query('track') track?: string, @Query('level') level?: string) {
//     return this.coursesService.searchCourses(q, track, level);
//   }

//   // Enrolled courses for current user
//   @Get('users/me/courses')
//   @ApiOperation({ summary: 'Get current user enrolled courses' })
//   @ApiResponse({ status: 200, description: 'List of enrolled courses retrieved.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   getUserEnrolledCourses(@CurrentUser('id') userId: string) {
//     return this.coursesService.findUserEnrolledCourses(userId);
//   }

//   // Courses CRUD
//   @Get('courses')
//   @ApiOperation({ summary: 'Retrieve all available courses' })
//   @ApiResponse({ status: 200, description: 'List of all courses retrieved.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   findAllCourses() {
//     return this.coursesService.findAllCourses();
//   }

//   @Post('courses')
//   @ApiOperation({ summary: 'Create a new course' })
//   @ApiResponse({ status: 201, description: 'Course created successfully.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   createCourse(@Body() dto: CreateCourseDto) {
//     return this.coursesService.createCourse(dto);
//   }

//   @Get('courses/:id')
//   @ApiOperation({ summary: 'Get a specific course by ID' })
//   @ApiResponse({ status: 200, description: 'Course found.' })
//   @ApiResponse({ status: 404, description: 'Course not found.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   findCourseById(@Param('id') id: string) {
//     return this.coursesService.findCourseById(id);
//   }

//   @Patch('courses/:id')
//   @ApiOperation({ summary: 'Update an existing course' })
//   @ApiResponse({ status: 200, description: 'Course updated successfully.' })
//   @ApiResponse({ status: 404, description: 'Course not found.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   updateCourse(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
//     return this.coursesService.updateCourse(id, dto);
//   }

//   @Delete('courses/:id')
//   @ApiOperation({ summary: 'Delete a course' })
//   @ApiResponse({ status: 200, description: 'Course deleted successfully.' })
//   @ApiResponse({ status: 404, description: 'Course not found.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   deleteCourse(@Param('id') id: string) {
//     return this.coursesService.deleteCourse(id);
//   }

//   // Topics
//   @Get('courses/:courseId/topics')
//   @ApiOperation({ summary: 'Get all topics belonging to a specific course' })
//   @ApiResponse({ status: 200, description: 'List of topics retrieved.' })
//   @ApiResponse({ status: 404, description: 'Course not found.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   findTopicsByCourse(@Param('courseId') courseId: string) {
//     return this.coursesService.findTopicsByCourse(courseId);
//   }

//   @Post('courses/:courseId/topics')
//   @ApiOperation({ summary: 'Create a new topic within a course' })
//   @ApiResponse({ status: 201, description: 'Topic created successfully.' })
//   @ApiResponse({ status: 404, description: 'Course not found.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   createTopic(@Param('courseId') courseId: string, @Body() dto: CreateTopicDto) {
//     return this.coursesService.createTopic(courseId, dto);
//   }

//   @Get('topics/:id')
//   @ApiOperation({ summary: 'Get a specific topic by ID' })
//   @ApiResponse({ status: 200, description: 'Topic found.' })
//   @ApiResponse({ status: 404, description: 'Topic not found.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   findTopicById(@Param('id') id: string) {
//     return this.coursesService.findTopicById(id);
//   }

//   @Patch('topics/:id')
//   @ApiOperation({ summary: 'Update an existing topic' })
//   @ApiResponse({ status: 200, description: 'Topic updated successfully.' })
//   @ApiResponse({ status: 404, description: 'Topic not found.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   updateTopic(@Param('id') id: string, @Body() dto: UpdateTopicDto) {
//     return this.coursesService.updateTopic(id, dto);
//   }

//   @Delete('topics/:id')
//   @ApiOperation({ summary: 'Delete a topic' })
//   @ApiResponse({ status: 200, description: 'Topic deleted successfully.' })
//   @ApiResponse({ status: 404, description: 'Topic not found.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   deleteTopic(@Param('id') id: string) {
//     return this.coursesService.deleteTopic(id);
//   }

//   // Enrollments
//   @Post('courses/:courseId/enroll')
//   @ApiOperation({ summary: 'Enroll the authenticated user in a course' })
//   @ApiResponse({ status: 201, description: 'Successfully enrolled in course.' })
//   @ApiResponse({ status: 404, description: 'Course not found.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   enrollUser(@CurrentUser('id') userId: string, @Param('courseId') courseId: string) {
//     return this.coursesService.enrollUser(userId, courseId);
//   }

//   @Delete('courses/:courseId/enroll')
//   @ApiOperation({ summary: 'Unenroll the authenticated user from a course' })
//   @ApiResponse({ status: 200, description: 'Successfully unenrolled from course.' })
//   @ApiResponse({ status: 404, description: 'Course or enrollment not found.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   unenrollUser(@CurrentUser('id') userId: string, @Param('courseId') courseId: string) {
//     return this.coursesService.unenrollUser(userId, courseId);
//   }
// }



// src/courses/courses.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CoursesService } from './courses.service.js';
import { CreateCourseDto, UpdateCourseDto, CreateTopicDto, UpdateTopicDto } from './dto/course.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { AdminOnly } from '../admin/auth/admin-only.decorator.js';
import { AdminPermission } from '../admin/auth/admin-permissions.js';
import { CatalogIntegrityService } from './catalog-integrity.service.js';
import { pickDefined } from '../common/utils/pick-defined.js';

@ApiTags('Courses, Topics & Enrollments')
@ApiBearerAuth()
@Controller('api/v1')
export class CoursesController {
  // Catalog writes are admin-only (content.manage, admin token). Reads, enrollment and search stay learner routes.
  constructor(
    private readonly coursesService: CoursesService,
    private readonly integrity: CatalogIntegrityService,
  ) {}

  // Course Search (Put before :id route to prevent collision)
  @UseGuards(JwtAuthGuard)
  @Get('courses/search')
  @ApiOperation({ summary: 'Search courses by query string, track, or level' })
  @ApiResponse({ status: 200, description: 'List of matching courses retrieved.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  searchCourses(@Query('q') q: string = '', @Query('track') track?: string, @Query('level') level?: string) {
    return this.coursesService.searchCourses(q, track, level);
  }

  // Enrolled courses for current user
  @UseGuards(JwtAuthGuard)
  @Get('users/me/courses')
  @ApiOperation({ summary: 'Get current user enrolled courses' })
  @ApiResponse({ status: 200, description: 'List of enrolled courses retrieved.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getUserEnrolledCourses(@CurrentUser('id') userId: string) {
    return this.coursesService.findUserEnrolledCourses(userId);
  }

  // Courses CRUD
  @UseGuards(JwtAuthGuard)
  @Get('courses')
  @ApiOperation({ summary: 'Retrieve all available courses' })
  @ApiResponse({ status: 200, description: 'List of all courses retrieved.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findAllCourses() {
    return this.coursesService.findAllCourses();
  }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 10, ttl: 60000 } })
  @AdminOnly(AdminPermission.CONTENT_MANAGE)
  @Post('courses')
  @ApiOperation({ summary: 'Create a new course' })
  @ApiResponse({ status: 201, description: 'Course created successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  createCourse(@Body() dto: CreateCourseDto) {
    return this.coursesService.createCourse(pickDefined(dto, ['title', 'description', 'track', 'level', 'departmentId']) as CreateCourseDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('courses/:id')
  @ApiOperation({ summary: 'Get a specific course by ID' })
  @ApiResponse({ status: 200, description: 'Course found.' })
  @ApiResponse({ status: 404, description: 'Course not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findCourseById(@Param('id') id: string) {
    return this.coursesService.findCourseById(id);
  }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 10, ttl: 60000 } })
  @AdminOnly(AdminPermission.CONTENT_MANAGE)
  @Patch('courses/:id')
  @ApiOperation({ summary: 'Update an existing course' })
  @ApiResponse({ status: 200, description: 'Course updated successfully.' })
  @ApiResponse({ status: 404, description: 'Course not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  updateCourse(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.coursesService.updateCourse(id, pickDefined(dto, ['title', 'description', 'track', 'level', 'departmentId']) as UpdateCourseDto);
  }

  @Throttle({ short: { limit: 1, ttl: 5000 }, long: { limit: 5, ttl: 60000 } })
  @AdminOnly(AdminPermission.CONTENT_MANAGE)
  @Delete('courses/:id')
  @ApiOperation({ summary: 'Delete a course' })
  @ApiResponse({ status: 200, description: 'Course deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Course not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async deleteCourse(@Param('id') id: string) {
    await this.coursesService.findCourseById(id);
    await this.integrity.assertCourseDeletable(id); // 409 instead of cascading topics/enrollments
    return this.coursesService.deleteCourse(id);
  }

  // Topics
  @UseGuards(JwtAuthGuard)
  @Get('courses/:courseId/topics')
  @ApiOperation({ summary: 'Get all topics belonging to a specific course' })
  @ApiResponse({ status: 200, description: 'List of topics retrieved.' })
  @ApiResponse({ status: 404, description: 'Course not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findTopicsByCourse(@Param('courseId') courseId: string) {
    return this.coursesService.findTopicsByCourse(courseId);
  }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 15, ttl: 60000 } })
  @AdminOnly(AdminPermission.CONTENT_MANAGE)
  @Post('courses/:courseId/topics')
  @ApiOperation({ summary: 'Create a new topic within a course' })
  @ApiResponse({ status: 201, description: 'Topic created successfully.' })
  @ApiResponse({ status: 404, description: 'Course not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  createTopic(@Param('courseId') courseId: string, @Body() dto: CreateTopicDto) {
    return this.coursesService.createTopic(courseId, pickDefined(dto, ['title', 'description', 'order']) as CreateTopicDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('topics/:id')
  @ApiOperation({ summary: 'Get a specific topic by ID' })
  @ApiResponse({ status: 200, description: 'Topic found.' })
  @ApiResponse({ status: 404, description: 'Topic not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findTopicById(@Param('id') id: string) {
    return this.coursesService.findTopicById(id);
  }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 15, ttl: 60000 } })
  @AdminOnly(AdminPermission.CONTENT_MANAGE)
  @Patch('topics/:id')
  @ApiOperation({ summary: 'Update an existing topic' })
  @ApiResponse({ status: 200, description: 'Topic updated successfully.' })
  @ApiResponse({ status: 404, description: 'Topic not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  updateTopic(@Param('id') id: string, @Body() dto: UpdateTopicDto) {
    return this.coursesService.updateTopic(id, pickDefined(dto, ['title', 'description', 'order']) as UpdateTopicDto);
  }

  @Throttle({ short: { limit: 1, ttl: 5000 }, long: { limit: 5, ttl: 60000 } })
  @AdminOnly(AdminPermission.CONTENT_MANAGE)
  @Delete('topics/:id')
  @ApiOperation({ summary: 'Delete a topic' })
  @ApiResponse({ status: 200, description: 'Topic deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Topic not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async deleteTopic(@Param('id') id: string) {
    await this.coursesService.findTopicById(id);
    await this.integrity.assertTopicDeletable(id); // 409 instead of orphaning learner progress
    return this.coursesService.deleteTopic(id);
  }

  // Enrollments
  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 10, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  @Post('courses/:courseId/enroll')
  @ApiOperation({ summary: 'Enroll the authenticated user in a course' })
  @ApiResponse({ status: 201, description: 'Successfully enrolled in course.' })
  @ApiResponse({ status: 404, description: 'Course not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  enrollUser(@CurrentUser('id') userId: string, @Param('courseId') courseId: string) {
    return this.coursesService.enrollUser(userId, courseId);
  }

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 10, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  @Delete('courses/:courseId/enroll')
  @ApiOperation({ summary: 'Unenroll the authenticated user from a course' })
  @ApiResponse({ status: 200, description: 'Successfully unenrolled from course.' })
  @ApiResponse({ status: 404, description: 'Course or enrollment not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  unenrollUser(@CurrentUser('id') userId: string, @Param('courseId') courseId: string) {
    return this.coursesService.unenrollUser(userId, courseId);
  }
}