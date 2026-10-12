// src/admin/analytics/analytics.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service.js';
import { AnalyticsQueryDto } from './dto/analytics-query.dto.js';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt.guard.js';
import { AdminPermission, RequireAdminPermission } from '../auth/admin-permissions.js';

@ApiTags('Admin Performance Analytics')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('api/v1/admin/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @RequireAdminPermission(AdminPermission.ANALYTICS_VIEW)
  @Get('overview')
  @ApiOperation({ summary: 'Get performance analytics overview' })
  @ApiResponse({ status: 200, description: 'Overview analytics retrieved successfully.' })
  getOverview(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getOverviewAnalytics(query);
  }

  @RequireAdminPermission(AdminPermission.ANALYTICS_VIEW)
  @Get('students')
  @ApiOperation({ summary: 'Get student performance analytics' })
  @ApiResponse({ status: 200, description: 'Student analytics retrieved successfully.' })
  getStudents(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getStudentsAnalytics(query);
  }

  @RequireAdminPermission(AdminPermission.ANALYTICS_VIEW)
  @Get('courses')
  @ApiOperation({ summary: 'Get course performance analytics' })
  @ApiResponse({ status: 200, description: 'Course analytics retrieved successfully.' })
  getCourses(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getCoursesAnalytics(query);
  }

  @RequireAdminPermission(AdminPermission.ANALYTICS_VIEW)
  @Get('subjects')
  @ApiOperation({ summary: 'Get subject performance analytics' })
  @ApiResponse({ status: 200, description: 'Subject analytics retrieved successfully.' })
  getSubjects(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getSubjectsAnalytics(query);
  }

  @RequireAdminPermission(AdminPermission.ANALYTICS_VIEW)
  @Get('exams')
  @ApiOperation({ summary: 'Get exam performance analytics' })
  @ApiResponse({ status: 200, description: 'Exam analytics retrieved successfully.' })
  getExams(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getExamsAnalytics(query);
  }

  @RequireAdminPermission(AdminPermission.ANALYTICS_VIEW)
  @Get('quizzes')
  @ApiOperation({ summary: 'Get quiz performance analytics' })
  @ApiResponse({ status: 200, description: 'Quiz analytics retrieved successfully.' })
  getQuizzes(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getQuizzesAnalytics(query);
  }

  @RequireAdminPermission(AdminPermission.ANALYTICS_VIEW)
  @Get('tests')
  @ApiOperation({ summary: 'Get test performance analytics' })
  @ApiResponse({ status: 200, description: 'Test analytics retrieved successfully.' })
  getTests(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getTestsAnalytics(query);
  }

  @RequireAdminPermission(AdminPermission.ANALYTICS_VIEW)
  @Get('learning')
  @ApiOperation({ summary: 'Get overall learning analytics (study hours, XP, coins)' })
  @ApiResponse({ status: 200, description: 'Learning analytics retrieved successfully.' })
  getLearning(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getLearningAnalytics(query);
  }

  @RequireAdminPermission(AdminPermission.ANALYTICS_VIEW)
  @Get('retention')
  @ApiOperation({ summary: 'Get user retention analytics (Day 1, 7, 30)' })
  @ApiResponse({ status: 200, description: 'Retention analytics retrieved successfully.' })
  getRetention(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getRetentionAnalytics(query);
  }

  @RequireAdminPermission(AdminPermission.ANALYTICS_VIEW)
  @Get('streaks')
  @ApiOperation({ summary: 'Get student learning streak analytics' })
  @ApiResponse({ status: 200, description: 'Streak analytics retrieved successfully.' })
  getStreaks(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getStreaksAnalytics(query);
  }
}