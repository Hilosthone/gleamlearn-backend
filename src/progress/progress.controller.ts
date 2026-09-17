// src/progress/progress.controller.ts
import { Controller, Get, Post, Param, Body, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProgressService } from './progress.service.js';
import { UpdateProgressDto } from './dto/update-progress.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@ApiTags('Learning Progress & Mastery')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get('progress')
  @ApiOperation({
    summary: 'Get overall learning progress',
    description: 'Retrieves overall completion metrics and progress statistics across all tracked courses for the authenticated user.'
  })
  @ApiResponse({ status: 200, description: 'Progress fetched successfully.' })
  getOverallProgress(@Request() req: any) {
    return this.progressService.getOverallProgress(req.user.userId);
  }

  @Get('progress/courses/:id')
  @ApiOperation({
    summary: 'Get course progress by ID',
    description: 'Fetches detailed completion status and progress metrics for a specific course.'
  })
  getCourseProgress(@Request() req: any, @Param('id') id: string) {
    return this.progressService.getCourseProgress(req.user.userId, id);
  }

  @Get('progress/topics/:id')
  @ApiOperation({
    summary: 'Get topic progress by ID',
    description: 'Fetches learning progress and milestone completion data for a specific topic.'
  })
  getTopicProgress(@Request() req: any, @Param('id') id: string) {
    return this.progressService.getTopicProgress(req.user.userId, id);
  }

  @Post('progress/update')
  @ApiOperation({
    summary: 'Update learning progress',
    description: 'Records or updates student progress percentages and recent activity for a course or topic.'
  })
  updateProgress(@Request() req: any, @Body() dto: UpdateProgressDto) {
    return this.progressService.updateProgress(req.user.userId, dto);
  }

  @Get('progress/history')
  @ApiOperation({
    summary: 'Get progress history log',
    description: 'Retrieves the chronological audit trail of learning updates and milestone achievements.'
  })
  getProgressHistory(@Request() req: any) {
    return this.progressService.getProgressHistory(req.user.userId);
  }

  @Get('mastery')
  @ApiOperation({
    summary: 'Get overall mastery metrics',
    description: 'Calculates the overall platform mastery score and proficiency distribution across subjects.'
  })
  getOverallMastery(@Request() req: any) {
    return this.progressService.getOverallMastery(req.user.userId);
  }

  @Get('mastery/courses/:id')
  @ApiOperation({
    summary: 'Get course mastery by ID',
    description: 'Retrieves granular topic mastery metrics for a specific course ID.'
  })
  getCourseMastery(@Request() req: any, @Param('id') id: string) {
    return this.progressService.getCourseMastery(req.user.userId, id);
  }

  @Get('mastery/topics/:id')
  @ApiOperation({
    summary: 'Get topic mastery by ID',
    description: 'Retrieves the exact proficiency score and mastery tier for a single topic.'
  })
  getTopicMastery(@Request() req: any, @Param('id') id: string) {
    return this.progressService.getTopicMastery(req.user.userId, id);
  }
}