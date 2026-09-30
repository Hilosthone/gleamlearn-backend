// src/admin/ai-moderation/ai-moderation.controller.ts
import { Controller, Get, Patch, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AiModerationService } from './ai-moderation.service.js';
import { AiContentQueryDto } from './dto/ai-content-query.dto.js';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt.guard.js';

@ApiTags('Admin AI Content Moderation')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('api/v1/admin/ai/generated-content')
export class AiModerationController {
  constructor(private readonly aiModerationService: AiModerationService) {}

  @Get()
  @ApiOperation({ summary: 'List all AI generated content awaiting moderation' })
  @ApiResponse({ status: 200, description: 'AI content list retrieved successfully.' })
  findAll(@Query() query: AiContentQueryDto) {
    return this.aiModerationService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific AI generated content record by ID' })
  @ApiResponse({ status: 200, description: 'AI content record retrieved successfully.' })
  findOne(@Param('id') id: string) {
    return this.aiModerationService.findOne(id);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve AI generated content' })
  @ApiResponse({ status: 200, description: 'AI content approved successfully.' })
  approve(@Param('id') id: string) {
    return this.aiModerationService.approve(id);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject AI generated content' })
  @ApiResponse({ status: 200, description: 'AI content rejected successfully.' })
  reject(@Param('id') id: string) {
    return this.aiModerationService.reject(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Permanently delete an AI generated content record' })
  @ApiResponse({ status: 200, description: 'AI content record deleted successfully.' })
  remove(@Param('id') id: string) {
    return this.aiModerationService.remove(id);
  }
}