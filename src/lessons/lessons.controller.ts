// // src/lessons/lessons.controller.ts
// import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
// import { ApiTags, ApiOperation } from '@nestjs/swagger';
// import { LessonsService } from './lessons.service.js';

// @ApiTags('Course Lessons & Progress')
// @Controller('api/v1')
// export class LessonsController {
//   constructor(private readonly lessonsService: LessonsService) {}

//   @Get('courses/:courseId/lessons')
//   @ApiOperation({ summary: 'Get all lessons for a specific course' })
//   findLessonsByCourse(@Param('courseId') courseId: string) {
//     return this.lessonsService.findLessonsByCourse(courseId);
//   }

//   @Post('courses/:courseId/lessons')
//   @ApiOperation({ summary: 'Create a new lesson under a course' })
//   createLesson(@Param('courseId') courseId: string, @Body() dto: any) {
//     return this.lessonsService.createLesson(courseId, dto);
//   }

//   @Get('lessons/:id')
//   @ApiOperation({ summary: 'Get a single lesson by ID' })
//   findLessonById(@Param('id') id: string) {
//     return this.lessonsService.findLessonById(id);
//   }

//   @Patch('lessons/:id')
//   @ApiOperation({ summary: 'Update a lesson' })
//   updateLesson(@Param('id') id: string, @Body() dto: any) {
//     return this.lessonsService.updateLesson(id, dto);
//   }

//   @Delete('lessons/:id')
//   @ApiOperation({ summary: 'Delete a lesson' })
//   removeLesson(@Param('id') id: string) {
//     return this.lessonsService.removeLesson(id);
//   }

//   @Post('lessons/:id/start')
//   @ApiOperation({ summary: 'Mark a lesson as started' })
//   startLesson(@Param('id') id: string) {
//     return this.lessonsService.startLesson(id, 'default-user-id');
//   }

//   @Post('lessons/:id/complete')
//   @ApiOperation({ summary: 'Mark a lesson as completed' })
//   completeLesson(@Param('id') id: string) {
//     return this.lessonsService.completeLesson(id, 'default-user-id');
//   }

//   @Get('lessons/:id/progress')
//   @ApiOperation({ summary: 'Get student progress for a specific lesson' })
//   getLessonProgress(@Param('id') id: string) {
//     return this.lessonsService.getLessonProgress(id, 'default-user-id');
//   }
// }


// // src/lessons/lessons.controller.ts
// import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
// import { LessonsService } from './lessons.service.js';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
// import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

// @ApiTags('Course Lessons & Progress')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
// @Controller('api/v1')
// export class LessonsController {
//   constructor(private readonly lessonsService: LessonsService) {}

//   @Get('courses/:courseId/lessons')
//   @ApiOperation({ summary: 'Get all lessons for a specific course' })
//   findLessonsByCourse(@Param('courseId') courseId: string) {
//     return this.lessonsService.findLessonsByCourse(courseId);
//   }

//   @Post('courses/:courseId/lessons')
//   @ApiOperation({ summary: 'Create a new lesson under a course' })
//   createLesson(@Param('courseId') courseId: string, @Body() dto: any) {
//     return this.lessonsService.createLesson(courseId, dto);
//   }

//   @Get('lessons/:id')
//   @ApiOperation({ summary: 'Get a single lesson by ID' })
//   findLessonById(@Param('id') id: string) {
//     return this.lessonsService.findLessonById(id);
//   }

//   @Patch('lessons/:id')
//   @ApiOperation({ summary: 'Update a lesson' })
//   updateLesson(@Param('id') id: string, @Body() dto: any) {
//     return this.lessonsService.updateLesson(id, dto);
//   }

//   @Delete('lessons/:id')
//   @ApiOperation({ summary: 'Delete a lesson' })
//   removeLesson(@Param('id') id: string) {
//     return this.lessonsService.removeLesson(id);
//   }

//   @Post('lessons/:id/start')
//   @ApiOperation({ summary: 'Mark a lesson as started' })
//   startLesson(@Param('id') id: string, @CurrentUser('id') userId: string) {
//     return this.lessonsService.startLesson(id, userId);
//   }

//   @Post('lessons/:id/complete')
//   @ApiOperation({ summary: 'Mark a lesson as completed' })
//   completeLesson(@Param('id') id: string, @CurrentUser('id') userId: string) {
//     return this.lessonsService.completeLesson(id, userId);
//   }

//   @Get('lessons/:id/progress')
//   @ApiOperation({ summary: 'Get student progress for a specific lesson' })
//   getLessonProgress(@Param('id') id: string, @CurrentUser('id') userId: string) {
//     return this.lessonsService.getLessonProgress(id, userId);
//   }
// }



// src/lessons/lessons.controller.ts
import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { LessonsService } from './lessons.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { AdminOnly } from '../admin/auth/admin-only.decorator.js';
import { AdminPermission } from '../admin/auth/admin-permissions.js';
import { CatalogIntegrityService } from '../courses/catalog-integrity.service.js';
import { pickDefined } from '../common/utils/pick-defined.js';
import { CoursesService } from '../courses/courses.service.js';
import { CreateLessonDto } from './dto/create-lesson.dto.js';
import { UpdateLessonDto } from './dto/update-lesson.dto.js';

@ApiTags('Course Lessons & Progress')
@ApiBearerAuth()
@Controller('api/v1')
export class LessonsController {
  // Lesson writes are admin-only (content.manage, admin token). Reading lessons and progress stay learner routes.
  constructor(
    private readonly lessonsService: LessonsService,
    private readonly integrity: CatalogIntegrityService,
    private readonly coursesService: CoursesService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('courses/:courseId/lessons')
  @ApiOperation({ summary: 'Get all lessons for a specific course' })
  @ApiResponse({ status: 200, description: 'List of lessons retrieved successfully.' })
  findLessonsByCourse(@Param('courseId') courseId: string) {
    return this.lessonsService.findLessonsByCourse(courseId);
  }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 15, ttl: 60000 } })
  @AdminOnly(AdminPermission.CONTENT_MANAGE)
  @Post('courses/:courseId/lessons')
  @ApiOperation({ summary: 'Create a new lesson under a course' })
  @ApiResponse({ status: 201, description: 'Lesson created successfully.' })
  async createLesson(@Param('courseId') courseId: string, @Body() dto: CreateLessonDto) {
    await this.coursesService.findCourseById(courseId); // 404 instead of a lesson attached to no course
    return this.lessonsService.createLesson(courseId, pickDefined(dto, ['title', 'content', 'orderIndex']));
  }

  @UseGuards(JwtAuthGuard)
  @Get('lessons/:id')
  @ApiOperation({ summary: 'Get a single lesson by ID' })
  @ApiResponse({ status: 200, description: 'Lesson found.' })
  findLessonById(@Param('id') id: string) {
    return this.lessonsService.findLessonById(id);
  }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 15, ttl: 60000 } })
  @AdminOnly(AdminPermission.CONTENT_MANAGE)
  @Patch('lessons/:id')
  @ApiOperation({ summary: 'Update a lesson' })
  @ApiResponse({ status: 200, description: 'Lesson updated successfully.' })
  updateLesson(@Param('id') id: string, @Body() dto: UpdateLessonDto) {
    return this.lessonsService.updateLesson(id, pickDefined(dto, ['title', 'content', 'orderIndex']));
  }

  @Throttle({ short: { limit: 1, ttl: 5000 }, long: { limit: 5, ttl: 60000 } })
  @AdminOnly(AdminPermission.CONTENT_MANAGE)
  @Delete('lessons/:id')
  @ApiOperation({ summary: 'Delete a lesson' })
  @ApiResponse({ status: 200, description: 'Lesson deleted successfully.' })
  async removeLesson(@Param('id') id: string) {
    await this.lessonsService.findLessonById(id);
    await this.integrity.assertLessonDeletable(id); // 409 instead of orphaning lesson progress
    return this.lessonsService.removeLesson(id);
  }

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 20, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  @Post('lessons/:id/start')
  @ApiOperation({ summary: 'Mark a lesson as started' })
  @ApiResponse({ status: 201, description: 'Lesson progress initialized.' })
  startLesson(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.lessonsService.startLesson(id, userId);
  }

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 20, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  @Post('lessons/:id/complete')
  @ApiOperation({ summary: 'Mark a lesson as completed' })
  @ApiResponse({ status: 201, description: 'Lesson marked as completed successfully.' })
  completeLesson(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.lessonsService.completeLesson(id, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('lessons/:id/progress')
  @ApiOperation({ summary: 'Get student progress for a specific lesson' })
  @ApiResponse({ status: 200, description: 'Lesson progress retrieved.' })
  getLessonProgress(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.lessonsService.getLessonProgress(id, userId);
  }
}