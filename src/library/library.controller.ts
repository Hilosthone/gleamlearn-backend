

// // src/library/library.controller.ts
// import { Controller, Get, Post, Delete, Param, Body, Query } from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiBody, ApiQuery } from '@nestjs/swagger';
// import { LibraryService } from './library.service.js';
// import { AddFavoriteDto } from './dto/add-favorite.dto.js';

// @ApiTags('Student Library')
// @Controller('api/v1/library')
// export class LibraryController {
//   constructor(private readonly libraryService: LibraryService) {}

//   @Get()
//   @ApiOperation({ summary: 'Get summary overview of student library items' })
//   getLibrarySummary() {
//     return this.libraryService.getLibrarySummary('current-user-id-placeholder');
//   }

//   @Get('courses')
//   @ApiOperation({ summary: 'Get all saved courses in student library' })
//   getSavedCourses() {
//     return this.libraryService.getSavedCourses('current-user-id-placeholder');
//   }

//   @Get('topics')
//   getTopics() {
//     return this.libraryService.getLibraryItemsByType('current-user-id-placeholder', 'TOPIC');
//   }

//   @Get('materials')
//   getMaterials() {
//     return this.libraryService.getLibraryItemsByType('current-user-id-placeholder', 'MATERIAL');
//   }

//   @Get('quizzes')
//   getQuizzes() {
//     return this.libraryService.getLibraryItemsByType('current-user-id-placeholder', 'QUIZ');
//   }

//   @Get('tests')
//   getTests() {
//     return this.libraryService.getLibraryItemsByType('current-user-id-placeholder', 'TEST');
//   }

//   @Get('exams')
//   getExams() {
//     return this.libraryService.getLibraryItemsByType('current-user-id-placeholder', 'EXAM');
//   }

//   @Post('courses/:courseId')
//   @ApiOperation({ summary: 'Save a course to the student library' })
//   saveCourse(@Param('courseId') courseId: string) {
//     return this.libraryService.saveCourse('current-user-id-placeholder', courseId);
//   }

//   @Delete('courses/:courseId')
//   @ApiOperation({ summary: 'Remove a saved course from the library' })
//   removeSavedCourse(@Param('courseId') courseId: string) {
//     return this.libraryService.removeSavedCourse('current-user-id-placeholder', courseId);
//   }

//   @Post('favorites/:id')
//   @ApiOperation({ summary: 'Add an item to library favorites' })
//   @ApiBody({ type: AddFavoriteDto })
//   addFavorite(
//     @Param('id') id: string, 
//     @Body() dto: AddFavoriteDto // Using DTO body payload instead of loose query strings for strict validation
//   ) {
//     return this.libraryService.addFavorite('current-user-id-placeholder', id, dto.type);
//   }

//   @Delete('favorites/:id')
//   @ApiOperation({ summary: 'Remove an item from library favorites' })
//   removeFavorite(@Param('id') id: string) {
//     return this.libraryService.removeFavorite('current-user-id-placeholder', id);
//   }
// }

// // src/library/library.controller.ts
// import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
// import { LibraryService } from './library.service.js';
// import { AddFavoriteDto } from './dto/add-favorite.dto.js';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
// import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

// @ApiTags('Student Library')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
// @Controller('api/v1/library')
// export class LibraryController {
//   constructor(private readonly libraryService: LibraryService) {}

//   @Get()
//   @ApiOperation({ summary: 'Get summary overview of student library items' })
//   @ApiResponse({ status: 200, description: 'Library overview summary retrieved successfully.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   getLibrarySummary(@CurrentUser('id') userId: string) {
//     return this.libraryService.getLibrarySummary(userId);
//   }

//   @Get('courses')
//   @ApiOperation({ summary: 'Get all saved courses in student library' })
//   @ApiResponse({ status: 200, description: 'List of saved courses retrieved successfully.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   getSavedCourses(@CurrentUser('id') userId: string) {
//     return this.libraryService.getSavedCourses(userId);
//   }

//   @Get('topics')
//   @ApiOperation({ summary: 'Get all saved topics in student library' })
//   @ApiResponse({ status: 200, description: 'List of saved topics retrieved successfully.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   getTopics(@CurrentUser('id') userId: string) {
//     return this.libraryService.getLibraryItemsByType(userId, 'TOPIC');
//   }

//   @Get('materials')
//   @ApiOperation({ summary: 'Get all saved study materials in student library' })
//   @ApiResponse({ status: 200, description: 'List of saved materials retrieved successfully.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   getMaterials(@CurrentUser('id') userId: string) {
//     return this.libraryService.getLibraryItemsByType(userId, 'MATERIAL');
//   }

//   @Get('quizzes')
//   @ApiOperation({ summary: 'Get all saved quizzes in student library' })
//   @ApiResponse({ status: 200, description: 'List of saved quizzes retrieved successfully.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   getQuizzes(@CurrentUser('id') userId: string) {
//     return this.libraryService.getLibraryItemsByType(userId, 'QUIZ');
//   }

//   @Get('tests')
//   @ApiOperation({ summary: 'Get all saved tests in student library' })
//   @ApiResponse({ status: 200, description: 'List of saved tests retrieved successfully.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   getTests(@CurrentUser('id') userId: string) {
//     return this.libraryService.getLibraryItemsByType(userId, 'TEST');
//   }

//   @Get('exams')
//   @ApiOperation({ summary: 'Get all saved exams in student library' })
//   @ApiResponse({ status: 200, description: 'List of saved exams retrieved successfully.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   getExams(@CurrentUser('id') userId: string) {
//     return this.libraryService.getLibraryItemsByType(userId, 'EXAM');
//   }

//   @Post('courses/:courseId')
//   @ApiOperation({ summary: 'Save a course to the student library' })
//   @ApiResponse({ status: 201, description: 'Course saved to library successfully.' })
//   @ApiResponse({ status: 404, description: 'Course not found.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   saveCourse(@CurrentUser('id') userId: string, @Param('courseId') courseId: string) {
//     return this.libraryService.saveCourse(userId, courseId);
//   }

//   @Delete('courses/:courseId')
//   @ApiOperation({ summary: 'Remove a saved course from the library' })
//   @ApiResponse({ status: 200, description: 'Saved course removed successfully.' })
//   @ApiResponse({ status: 404, description: 'Saved course not found.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   removeSavedCourse(@CurrentUser('id') userId: string, @Param('courseId') courseId: string) {
//     return this.libraryService.removeSavedCourse(userId, courseId);
//   }

//   @Post('favorites/:id')
//   @ApiOperation({ summary: 'Add an item to library favorites' })
//   @ApiResponse({ status: 201, description: 'Item added to favorites successfully.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   @ApiBody({ type: AddFavoriteDto })
//   addFavorite(
//     @CurrentUser('id') userId: string,
//     @Param('id') id: string, 
//     @Body() dto: AddFavoriteDto
//   ) {
//     return this.libraryService.addFavorite(userId, id, dto.type);
//   }

//   @Delete('favorites/:id')
//   @ApiOperation({ summary: 'Remove an item from library favorites' })
//   @ApiResponse({ status: 200, description: 'Item removed from favorites successfully.' })
//   @ApiResponse({ status: 404, description: 'Favorite item not found.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   removeFavorite(@CurrentUser('id') userId: string, @Param('id') id: string) {
//     return this.libraryService.removeFavorite(userId, id);
//   }
// }





// src/library/library.controller.ts
import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { LibraryService } from './library.service.js';
import { AddFavoriteDto } from './dto/add-favorite.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('Student Library')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/library')
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @Get()
  @ApiOperation({ summary: 'Get summary overview of student library items' })
  @ApiResponse({ status: 200, description: 'Library overview summary retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getLibrarySummary(@CurrentUser('id') userId: string) {
    return this.libraryService.getLibrarySummary(userId);
  }

  @Get('courses')
  @ApiOperation({ summary: 'Get all saved courses in student library' })
  @ApiResponse({ status: 200, description: 'List of saved courses retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getSavedCourses(@CurrentUser('id') userId: string) {
    return this.libraryService.getSavedCourses(userId);
  }

  @Get('topics')
  @ApiOperation({ summary: 'Get all saved topics in student library' })
  @ApiResponse({ status: 200, description: 'List of saved topics retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getTopics(@CurrentUser('id') userId: string) {
    return this.libraryService.getLibraryItemsByType(userId, 'TOPIC');
  }

  @Get('materials')
  @ApiOperation({ summary: 'Get all saved study materials in student library' })
  @ApiResponse({ status: 200, description: 'List of saved materials retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getMaterials(@CurrentUser('id') userId: string) {
    return this.libraryService.getLibraryItemsByType(userId, 'MATERIAL');
  }

  @Get('quizzes')
  @ApiOperation({ summary: 'Get all saved quizzes in student library' })
  @ApiResponse({ status: 200, description: 'List of saved quizzes retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getQuizzes(@CurrentUser('id') userId: string) {
    return this.libraryService.getLibraryItemsByType(userId, 'QUIZ');
  }

  @Get('tests')
  @ApiOperation({ summary: 'Get all saved tests in student library' })
  @ApiResponse({ status: 200, description: 'List of saved tests retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getTests(@CurrentUser('id') userId: string) {
    return this.libraryService.getLibraryItemsByType(userId, 'TEST');
  }

  @Get('exams')
  @ApiOperation({ summary: 'Get all saved exams in student library' })
  @ApiResponse({ status: 200, description: 'List of saved exams retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getExams(@CurrentUser('id') userId: string) {
    return this.libraryService.getLibraryItemsByType(userId, 'EXAM');
  }

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 20, ttl: 60000 } })
  @Post('courses/:courseId')
  @ApiOperation({ summary: 'Save a course to the student library' })
  @ApiResponse({ status: 201, description: 'Course saved to library successfully.' })
  @ApiResponse({ status: 404, description: 'Course not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  saveCourse(@CurrentUser('id') userId: string, @Param('courseId') courseId: string) {
    return this.libraryService.saveCourse(userId, courseId);
  }

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 20, ttl: 60000 } })
  @Delete('courses/:courseId')
  @ApiOperation({ summary: 'Remove a saved course from the library' })
  @ApiResponse({ status: 200, description: 'Saved course removed successfully.' })
  @ApiResponse({ status: 404, description: 'Saved course not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  removeSavedCourse(@CurrentUser('id') userId: string, @Param('courseId') courseId: string) {
    return this.libraryService.removeSavedCourse(userId, courseId);
  }

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 20, ttl: 60000 } })
  @Post('favorites/:id')
  @ApiOperation({ summary: 'Add an item to library favorites' })
  @ApiResponse({ status: 201, description: 'Item added to favorites successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiBody({ type: AddFavoriteDto })
  addFavorite(
    @CurrentUser('id') userId: string,
    @Param('id') id: string, 
    @Body() dto: AddFavoriteDto
  ) {
    return this.libraryService.addFavorite(userId, id, dto.type);
  }

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 20, ttl: 60000 } })
  @Delete('favorites/:id')
  @ApiOperation({ summary: 'Remove an item from library favorites' })
  @ApiResponse({ status: 200, description: 'Item removed from favorites successfully.' })
  @ApiResponse({ status: 404, description: 'Favorite item not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  removeFavorite(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.libraryService.removeFavorite(userId, id);
  }
}