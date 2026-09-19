// src/recommendations/recommendations.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('AI Recommendations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard) // Secures all recommendations routing behind JWT authentication
@Controller('api/v1/recommendations')
export class RecommendationsController {
  constructor(private readonly recsService: RecommendationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all personalized recommendations for the authenticated student' })
  getAll(@CurrentUser() user: any) {
    return this.recsService.proxyToPython(`?userId=${user.id}`);
  }

  @Get('courses')
  @ApiOperation({ summary: 'Get personalized course recommendations' })
  getCourses(@CurrentUser() user: any) {
    return this.recsService.proxyToPython(`/courses?userId=${user.id}`);
  }

  @Get('topics')
  @ApiOperation({ summary: 'Get recommended study topics based on progress' })
  getTopics(@CurrentUser() user: any) {
    return this.recsService.proxyToPython(`/topics?userId=${user.id}`);
  }

  @Get('quizzes')
  @ApiOperation({ summary: 'Get recommended practice quizzes for skill gaps' })
  getQuizzes(@CurrentUser() user: any) {
    return this.recsService.proxyToPython(`/quizzes?userId=${user.id}`);
  }

  @Get('revision')
  @ApiOperation({ summary: 'Get spaced-repetition revision recommendations' })
  getRevision(@CurrentUser() user: any) {
    return this.recsService.proxyToPython(`/revision?userId=${user.id}`);
  }

  @Get('exams')
  @ApiOperation({ summary: 'Get recommended mock exam simulations' })
  getExams(@CurrentUser() user: any) {
    return this.recsService.proxyToPython(`/exams?userId=${user.id}`);
  }
}