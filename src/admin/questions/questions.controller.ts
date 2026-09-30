// src/admin/questions/questions.controller.ts
import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { QuestionsService } from './questions.service.js';
import { CreateAdminQuestionDto } from './dto/create-admin-question.dto.js';
import { UpdateAdminQuestionDto } from './dto/update-admin-question.dto.js';
import { AdminQuestionsQueryDto } from './dto/admin-questions-query.dto.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';

@ApiTags('Admin Question Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/admin/questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  @ApiOperation({ summary: 'List all questions with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Questions retrieved successfully.' })
  findAll(@Query() query: AdminQuestionsQueryDto) {
    return this.questionsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific question by ID' })
  @ApiResponse({ status: 200, description: 'Question retrieved successfully.' })
  findOne(@Param('id') id: string) {
    return this.questionsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new question' })
  @ApiResponse({ status: 201, description: 'Question created successfully.' })
  create(@Body() dto: CreateAdminQuestionDto) {
    return this.questionsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing question' })
  @ApiResponse({ status: 200, description: 'Question updated successfully.' })
  update(@Param('id') id: string, @Body() dto: UpdateAdminQuestionDto) {
    return this.questionsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Permanently delete a question' })
  @ApiResponse({ status: 200, description: 'Question deleted successfully.' })
  remove(@Param('id') id: string) {
    return this.questionsService.remove(id);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve a submitted question' })
  @ApiResponse({ status: 200, description: 'Question approved successfully.' })
  approve(@Param('id') id: string) {
    return this.questionsService.approve(id);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject a submitted question' })
  @ApiResponse({ status: 200, description: 'Question rejected successfully.' })
  reject(@Param('id') id: string) {
    return this.questionsService.reject(id);
  }
}