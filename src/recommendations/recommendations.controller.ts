// // src/recommendations/recommendations.controller.ts
// import { Controller, Get, UseGuards } from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
// import { RecommendationsService } from './recommendations.service.js';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
// import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

// @ApiTags('AI Recommendations')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard) // Secures all recommendations routing behind JWT authentication
// @Controller('api/v1/recommendations')
// export class RecommendationsController {
//   constructor(private readonly recsService: RecommendationsService) {}

//   @Get()
//   @ApiOperation({ summary: 'Get all personalized recommendations for the authenticated student' })
//   getAll(@CurrentUser() user: any) {
//     return this.recsService.proxyToPython(`?userId=${user.id}`);
//   }

//   @Get('courses')
//   @ApiOperation({ summary: 'Get personalized course recommendations' })
//   getCourses(@CurrentUser() user: any) {
//     return this.recsService.proxyToPython(`/courses?userId=${user.id}`);
//   }

//   @Get('topics')
//   @ApiOperation({ summary: 'Get recommended study topics based on progress' })
//   getTopics(@CurrentUser() user: any) {
//     return this.recsService.proxyToPython(`/topics?userId=${user.id}`);
//   }

//   @Get('quizzes')
//   @ApiOperation({ summary: 'Get recommended practice quizzes for skill gaps' })
//   getQuizzes(@CurrentUser() user: any) {
//     return this.recsService.proxyToPython(`/quizzes?userId=${user.id}`);
//   }

//   @Get('revision')
//   @ApiOperation({ summary: 'Get spaced-repetition revision recommendations' })
//   getRevision(@CurrentUser() user: any) {
//     return this.recsService.proxyToPython(`/revision?userId=${user.id}`);
//   }

//   @Get('exams')
//   @ApiOperation({ summary: 'Get recommended mock exam simulations' })
//   getExams(@CurrentUser() user: any) {
//     return this.recsService.proxyToPython(`/exams?userId=${user.id}`);
//   }
// }



// src/recommendations/recommendations.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('AI Recommendations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard) // Secures all recommendations routing behind JWT authentication
@Controller('api/v1/recommendations')
export class RecommendationsController {
  constructor(private readonly recsService: RecommendationsService) {}

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 15, ttl: 60000 } })
  @Get()
  @ApiOperation({ summary: 'Get all personalized recommendations for the authenticated student' })
  @ApiResponse({ status: 200, description: 'Personalized recommendations retrieved successfully.' })
  getAll(@CurrentUser() user: any) {
    return this.recsService.proxyToPython(`?userId=${user.id}`);
  }

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 15, ttl: 60000 } })
  @Get('courses')
  @ApiOperation({ summary: 'Get personalized course recommendations' })
  @ApiResponse({ status: 200, description: 'Course recommendations retrieved successfully.' })
  getCourses(@CurrentUser() user: any) {
    return this.recsService.proxyToPython(`/courses?userId=${user.id}`);
  }

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 15, ttl: 60000 } })
  @Get('topics')
  @ApiOperation({ summary: 'Get recommended study topics based on progress' })
  @ApiResponse({ status: 200, description: 'Topic recommendations retrieved successfully.' })
  getTopics(@CurrentUser() user: any) {
    return this.recsService.proxyToPython(`/topics?userId=${user.id}`);
  }

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 15, ttl: 60000 } })
  @Get('quizzes')
  @ApiOperation({ summary: 'Get recommended practice quizzes for skill gaps' })
  @ApiResponse({ status: 200, description: 'Quiz recommendations retrieved successfully.' })
  getQuizzes(@CurrentUser() user: any) {
    return this.recsService.proxyToPython(`/quizzes?userId=${user.id}`);
  }

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 15, ttl: 60000 } })
  @Get('revision')
  @ApiOperation({ summary: 'Get spaced-repetition revision recommendations' })
  @ApiResponse({ status: 200, description: 'Revision recommendations retrieved successfully.' })
  getRevision(@CurrentUser() user: any) {
    return this.recsService.proxyToPython(`/revision?userId=${user.id}`);
  }

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 15, ttl: 60000 } })
  @Get('exams')
  @ApiOperation({ summary: 'Get recommended mock exam simulations' })
  @ApiResponse({ status: 200, description: 'Exam recommendations retrieved successfully.' })
  getExams(@CurrentUser() user: any) {
    return this.recsService.proxyToPython(`/exams?userId=${user.id}`);
  }
}