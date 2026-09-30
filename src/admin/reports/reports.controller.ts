// src/admin/reports/reports.controller.ts
import { Controller, Get, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ReportsService } from './reports.service.js';
import { AdminReportsQueryDto } from './dto/admin-reports-query.dto.js';
import { UpdateAdminReportDto } from './dto/update-admin-report.dto.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';

@ApiTags('Admin Reports Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/admin/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @ApiOperation({ summary: 'List all platform reports with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Reports retrieved successfully.' })
  findAll(@Query() query: AdminReportsQueryDto) {
    return this.reportsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific report by ID' })
  @ApiResponse({ status: 200, description: 'Report retrieved successfully.' })
  findOne(@Param('id') id: string) {
    return this.reportsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update report details' })
  @ApiResponse({ status: 200, description: 'Report updated successfully.' })
  update(@Param('id') id: string, @Body() dto: UpdateAdminReportDto) {
    return this.reportsService.update(id, dto);
  }

  @Patch(':id/resolve')
  @ApiOperation({ summary: 'Mark a report as resolved' })
  @ApiResponse({ status: 200, description: 'Report resolved successfully.' })
  resolve(@Param('id') id: string) {
    return this.reportsService.resolve(id);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject a report' })
  @ApiResponse({ status: 200, description: 'Report rejected successfully.' })
  reject(@Param('id') id: string) {
    return this.reportsService.reject(id);
  }
}