// src/admin/activity/activity.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ActivityService } from './activity.service.js';
import { ActivityQueryDto } from './dto/activity-query.dto.js';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt.guard.js';

@ApiTags('Admin Activity Monitoring')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('api/v1/admin/activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  @ApiOperation({ summary: 'Get global platform activity logs' })
  @ApiResponse({ status: 200, description: 'Activity logs retrieved successfully.' })
  getAllActivity(@Query() query: ActivityQueryDto) {
    return this.activityService.getGlobalActivity(query);
  }

  @Get('users')
  @ApiOperation({ summary: 'Get user-related activity logs (logins, account changes, etc.)' })
  @ApiResponse({ status: 200, description: 'User activity logs retrieved successfully.' })
  getUsersActivity(@Query() query: ActivityQueryDto) {
    return this.activityService.getGlobalActivity(query, 'USERS');
  }

  @Get('learning')
  @ApiOperation({ summary: 'Get learning activity logs (course creation, enrollments, lessons)' })
  @ApiResponse({ status: 200, description: 'Learning activity logs retrieved successfully.' })
  getLearningActivity(@Query() query: ActivityQueryDto) {
    return this.activityService.getGlobalActivity(query, 'LEARNING');
  }

  @Get('assessments')
  @ApiOperation({ summary: 'Get assessment activity logs (quizzes, tests, exams)' })
  @ApiResponse({ status: 200, description: 'Assessment activity logs retrieved successfully.' })
  getAssessmentsActivity(@Query() query: ActivityQueryDto) {
    return this.activityService.getGlobalActivity(query, 'ASSESSMENTS');
  }

  @Get('ai')
  @ApiOperation({ summary: 'Get AI session and usage activity logs' })
  @ApiResponse({ status: 200, description: 'AI activity logs retrieved successfully.' })
  getAiActivity(@Query() query: ActivityQueryDto) {
    return this.activityService.getGlobalActivity(query, 'AI');
  }

  @Get('payments')
  @ApiOperation({ summary: 'Get payment, subscription, and financial activity logs' })
  @ApiResponse({ status: 200, description: 'Payment activity logs retrieved successfully.' })
  getPaymentsActivity(@Query() query: ActivityQueryDto) {
    return this.activityService.getGlobalActivity(query, 'PAYMENTS');
  }
}