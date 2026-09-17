// src/goals/goals.controller.ts
import { Controller, Get, Post, Patch, Delete, Param, Body, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GoalsService } from './goals.service.js';
import { CreateStudyGoalDto, UpdateStudyGoalDto } from './dto/study-goal.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@ApiTags('Study Goals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get()
  @ApiOperation({
    summary: 'Retrieve all study goals',
    description: 'Fetches all personalized study goals and targets created by the authenticated user.'
  })
  @ApiResponse({ status: 200, description: 'Goals retrieved successfully.' })
  findAll(@Request() req: any) {
    return this.goalsService.findAll(req.user.userId);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new study goal',
    description: 'Creates a new study objective with custom targets, deadlines, and categories.'
  })
  @ApiResponse({ status: 201, description: 'Goal created successfully.' })
  create(@Request() req: any, @Body() dto: CreateStudyGoalDto) {
    return this.goalsService.create(req.user.userId, dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get study goal by ID',
    description: 'Fetches details of a specific study goal using its unique identifier.'
  })
  @ApiResponse({ status: 200, description: 'Goal found.' })
  @ApiResponse({ status: 404, description: 'Goal not found.' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.goalsService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a study goal',
    description: 'Modifies fields, target parameters, or descriptions of an existing study goal.'
  })
  @ApiResponse({ status: 200, description: 'Goal updated successfully.' })
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateStudyGoalDto) {
    return this.goalsService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a study goal',
    description: 'Permanently removes a study goal from the database.'
  })
  @ApiResponse({ status: 200, description: 'Goal deleted successfully.' })
  remove(@Request() req: any, @Param('id') id: string) {
    return this.goalsService.remove(req.user.userId, id);
  }

  @Post(':id/complete')
  @ApiOperation({
    summary: 'Mark goal as complete',
    description: 'Instantly sets a study goal status to completed and synchronizes final value metrics.'
  })
  @ApiResponse({ status: 200, description: 'Goal marked as complete.' })
  completeGoal(@Request() req: any, @Param('id') id: string) {
    return this.goalsService.completeGoal(req.user.userId, id);
  }

  @Get(':id/progress')
  @ApiOperation({
    summary: 'Get goal progress metrics',
    description: 'Calculates the exact completion percentage and status breakdown for a specific study goal.'
  })
  @ApiResponse({ status: 200, description: 'Goal progress calculated successfully.' })
  getGoalProgress(@Request() req: any, @Param('id') id: string) {
    return this.goalsService.getGoalProgress(req.user.userId, id);
  }
}