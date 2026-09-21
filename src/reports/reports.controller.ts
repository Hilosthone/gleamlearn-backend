// // src/reports/reports.controller.ts
// import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
// import { ReportsService } from './reports.service.js';
// import { CreateReportDto } from './dto/create-report.dto.js';
// import { CreateFeedbackDto } from './dto/create-feedback.dto.js';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
// import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

// @ApiTags('Reports & Feedback')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
// @Controller('api/v1')
// export class ReportsController {
//   constructor(private readonly reportsService: ReportsService) {}

//   @Post('reports')
//   @ApiOperation({ summary: 'Submit a general system or user report' })
//   @ApiResponse({ status: 201, description: 'Report successfully submitted.' })
//   async createReport(@Body() dto: CreateReportDto, @CurrentUser() user: any) {
//     return this.reportsService.createReport(dto, user.id);
//   }

//   @Get('reports/me')
//   @ApiOperation({ summary: 'Get reports submitted by the current authenticated user' })
//   @ApiResponse({ status: 200, description: 'List of user reports returned successfully.' })
//   async getUserReports(@CurrentUser() user: any) {
//     return this.reportsService.getUserReports(user.id);
//   }

//   @Post('feedback')
//   @ApiOperation({ summary: 'Submit user platform feedback and rating' })
//   @ApiResponse({ status: 201, description: 'Feedback successfully recorded.' })
//   async submitFeedback(@Body() dto: CreateFeedbackDto, @CurrentUser() user: any) {
//     return this.reportsService.submitFeedback(dto, user.id);
//   }

//   @Post('questions/:id/report')
//   @ApiOperation({ summary: 'Report a specific question item' })
//   @ApiResponse({ status: 201, description: 'Question report successfully submitted.' })
//   async reportQuestion(
//     @Param('id') questionId: string,
//     @Body() dto: CreateReportDto,
//     @CurrentUser() user: any,
//   ) {
//     return this.reportsService.reportTarget('QUESTION', questionId, dto, user.id);
//   }

//   @Post('content/:id/report')
//   @ApiOperation({ summary: 'Report a specific content item or material' })
//   @ApiResponse({ status: 201, description: 'Content report successfully submitted.' })
//   async reportContent(
//     @Param('id') contentId: string,
//     @Body() dto: CreateReportDto,
//     @CurrentUser() user: any,
//   ) {
//     return this.reportsService.reportTarget('CONTENT', contentId, dto, user.id);
//   }
// }


// src/reports/reports.controller.ts
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service.js';
import { CreateReportDto } from './dto/create-report.dto.js';
import { CreateFeedbackDto } from './dto/create-feedback.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('Reports & Feedback')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Throttle({ short: { limit: 1, ttl: 5000 }, long: { limit: 5, ttl: 60000 } })
  @Post('reports')
  @ApiOperation({ summary: 'Submit a general system or user report' })
  @ApiResponse({ status: 201, description: 'Report successfully submitted.' })
  async createReport(@Body() dto: CreateReportDto, @CurrentUser() user: any) {
    return this.reportsService.createReport(dto, user.id);
  }

  @Get('reports/me')
  @ApiOperation({ summary: 'Get reports submitted by the current authenticated user' })
  @ApiResponse({ status: 200, description: 'List of user reports returned successfully.' })
  async getUserReports(@CurrentUser() user: any) {
    return this.reportsService.getUserReports(user.id);
  }

  @Throttle({ short: { limit: 1, ttl: 5000 }, long: { limit: 5, ttl: 60000 } })
  @Post('feedback')
  @ApiOperation({ summary: 'Submit user platform feedback and rating' })
  @ApiResponse({ status: 201, description: 'Feedback successfully recorded.' })
  async submitFeedback(@Body() dto: CreateFeedbackDto, @CurrentUser() user: any) {
    return this.reportsService.submitFeedback(dto, user.id);
  }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 10, ttl: 60000 } })
  @Post('questions/:id/report')
  @ApiOperation({ summary: 'Report a specific question item' })
  @ApiResponse({ status: 201, description: 'Question report successfully submitted.' })
  async reportQuestion(
    @Param('id') questionId: string,
    @Body() dto: CreateReportDto,
    @CurrentUser() user: any,
  ) {
    return this.reportsService.reportTarget('QUESTION', questionId, dto, user.id);
  }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 10, ttl: 60000 } })
  @Post('content/:id/report')
  @ApiOperation({ summary: 'Report a specific content item or material' })
  @ApiResponse({ status: 201, description: 'Content report successfully submitted.' })
  async reportContent(
    @Param('id') contentId: string,
    @Body() dto: CreateReportDto,
    @CurrentUser() user: any,
  ) {
    return this.reportsService.reportTarget('CONTENT', contentId, dto, user.id);
  }
}