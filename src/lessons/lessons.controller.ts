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


// src/lessons/lessons.controller.ts
import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LessonsService } from './lessons.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('Course Lessons & Progress')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Get('courses/:courseId/lessons')
  @ApiOperation({ summary: 'Get all lessons for a specific course' })
  findLessonsByCourse(@Param('courseId') courseId: string) {
    return this.lessonsService.findLessonsByCourse(courseId);
  }

  @Post('courses/:courseId/lessons')
  @ApiOperation({ summary: 'Create a new lesson under a course' })
  createLesson(@Param('courseId') courseId: string, @Body() dto: any) {
    return this.lessonsService.createLesson(courseId, dto);
  }

  @Get('lessons/:id')
  @ApiOperation({ summary: 'Get a single lesson by ID' })
  findLessonById(@Param('id') id: string) {
    return this.lessonsService.findLessonById(id);
  }

  @Patch('lessons/:id')
  @ApiOperation({ summary: 'Update a lesson' })
  updateLesson(@Param('id') id: string, @Body() dto: any) {
    return this.lessonsService.updateLesson(id, dto);
  }

  @Delete('lessons/:id')
  @ApiOperation({ summary: 'Delete a lesson' })
  removeLesson(@Param('id') id: string) {
    return this.lessonsService.removeLesson(id);
  }

  @Post('lessons/:id/start')
  @ApiOperation({ summary: 'Mark a lesson as started' })
  startLesson(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.lessonsService.startLesson(id, userId);
  }

  @Post('lessons/:id/complete')
  @ApiOperation({ summary: 'Mark a lesson as completed' })
  completeLesson(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.lessonsService.completeLesson(id, userId);
  }

  @Get('lessons/:id/progress')
  @ApiOperation({ summary: 'Get student progress for a specific lesson' })
  getLessonProgress(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.lessonsService.getLessonProgress(id, userId);
  }
}