// src/admin/dashboard/dashboard.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service.js';
import { DashboardQueryDto } from './dto/dashboard-query.dto.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';

@ApiTags('Admin Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/admin/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get comprehensive admin dashboard overview statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard overview retrieved successfully.' })
  getOverview(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getOverview();
  }

  @Get('users')
  @ApiOperation({ summary: 'Get detailed user statistics' })
  @ApiResponse({ status: 200, description: 'User metrics retrieved successfully.' })
  getUsersMetrics() {
    return this.dashboardService.getUsersMetrics();
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get platform activity logs and session metrics' })
  @ApiResponse({ status: 200, description: 'Activity metrics retrieved successfully.' })
  getActivityMetrics() {
    return this.dashboardService.getActivityMetrics();
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get subscription revenue and financial metrics' })
  @ApiResponse({ status: 200, description: 'Revenue metrics retrieved successfully.' })
  getRevenueMetrics() {
    return this.dashboardService.getRevenueMetrics();
  }

  @Get('learning')
  @ApiOperation({ summary: 'Get educational content metrics' })
  @ApiResponse({ status: 200, description: 'Learning metrics retrieved successfully.' })
  getLearningMetrics() {
    return this.dashboardService.getLearningMetrics();
  }

  @Get('engagement')
  @ApiOperation({ summary: 'Get user engagement metrics' })
  @ApiResponse({ status: 200, description: 'Engagement metrics retrieved successfully.' })
  getEngagementMetrics() {
    return this.dashboardService.getEngagementMetrics();
  }
}