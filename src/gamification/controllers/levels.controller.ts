// src/gamification/controllers/levels.controller.ts
import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { LevelsService } from '../services/levels.service.js';

interface RequestWithUser extends Request {
  user: { id: string; email: string };
}

@ApiTags('Levels & Ranks')
@Controller('api/v1/levels')
export class LevelsController {
  constructor(private readonly levelsService: LevelsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all system levels and progression configuration' })
  @ApiResponse({ status: 200, description: 'Levels configuration retrieved successfully.' })
  getSystemLevels() {
    return this.levelsService.getSystemLevels();
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get current authenticated user level and XP progress' })
  @ApiResponse({ status: 200, description: 'User level data fetched successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getUserLevel(@Req() req: RequestWithUser) {
    return this.levelsService.getUserLevel(req.user.id);
  }
}