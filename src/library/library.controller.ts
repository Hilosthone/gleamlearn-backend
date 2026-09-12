// //src/library/library.controller.ts
// import { Controller, Get, Post, Delete, Param, Query } from '@nestjs/common';
// import { ApiTags, ApiOperation } from '@nestjs/swagger';
// import { LibraryService } from './library.service.js';

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
//   saveCourse(@Param('courseId') courseId: string) {
//     return this.libraryService.saveCourse('current-user-id-placeholder', courseId);
//   }

//   @Delete('courses/:courseId')
//   removeSavedCourse(@Param('courseId') courseId: string) {
//     return this.libraryService.removeSavedCourse('current-user-id-placeholder', courseId);
//   }

//   @Post('favorites/:id')
//   addFavorite(@Param('id') id: string, @Query('type') type: string = 'MATERIAL') {
//     return this.libraryService.addFavorite('current-user-id-placeholder', id, type);
//   }

//   @Delete('favorites/:id')
//   removeFavorite(@Param('id') id: string) {
//     return this.libraryService.removeFavorite('current-user-id-placeholder', id);
//   }
// }


// src/library/library.controller.ts
import { Controller, Get, Post, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiQuery } from '@nestjs/swagger';
import { LibraryService } from './library.service.js';
import { AddFavoriteDto } from './dto/add-favorite.dto.js';

@ApiTags('Student Library')
@Controller('api/v1/library')
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @Get()
  @ApiOperation({ summary: 'Get summary overview of student library items' })
  getLibrarySummary() {
    return this.libraryService.getLibrarySummary('current-user-id-placeholder');
  }

  @Get('courses')
  @ApiOperation({ summary: 'Get all saved courses in student library' })
  getSavedCourses() {
    return this.libraryService.getSavedCourses('current-user-id-placeholder');
  }

  @Get('topics')
  getTopics() {
    return this.libraryService.getLibraryItemsByType('current-user-id-placeholder', 'TOPIC');
  }

  @Get('materials')
  getMaterials() {
    return this.libraryService.getLibraryItemsByType('current-user-id-placeholder', 'MATERIAL');
  }

  @Get('quizzes')
  getQuizzes() {
    return this.libraryService.getLibraryItemsByType('current-user-id-placeholder', 'QUIZ');
  }

  @Get('tests')
  getTests() {
    return this.libraryService.getLibraryItemsByType('current-user-id-placeholder', 'TEST');
  }

  @Get('exams')
  getExams() {
    return this.libraryService.getLibraryItemsByType('current-user-id-placeholder', 'EXAM');
  }

  @Post('courses/:courseId')
  @ApiOperation({ summary: 'Save a course to the student library' })
  saveCourse(@Param('courseId') courseId: string) {
    return this.libraryService.saveCourse('current-user-id-placeholder', courseId);
  }

  @Delete('courses/:courseId')
  @ApiOperation({ summary: 'Remove a saved course from the library' })
  removeSavedCourse(@Param('courseId') courseId: string) {
    return this.libraryService.removeSavedCourse('current-user-id-placeholder', courseId);
  }

  @Post('favorites/:id')
  @ApiOperation({ summary: 'Add an item to library favorites' })
  @ApiBody({ type: AddFavoriteDto })
  addFavorite(
    @Param('id') id: string, 
    @Body() dto: AddFavoriteDto // Using DTO body payload instead of loose query strings for strict validation
  ) {
    return this.libraryService.addFavorite('current-user-id-placeholder', id, dto.type);
  }

  @Delete('favorites/:id')
  @ApiOperation({ summary: 'Remove an item from library favorites' })
  removeFavorite(@Param('id') id: string) {
    return this.libraryService.removeFavorite('current-user-id-placeholder', id);
  }
}