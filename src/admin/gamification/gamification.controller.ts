import { Controller, Get, Post, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { GamificationService } from './gamification.service.js';
import { GamificationQueryDto } from './dto/gamification-query.dto.js';
import { ManualAdjustmentDto } from './dto/manual-adjustment.dto.js';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt.guard.js';

@ApiTags('Admin Gamification Management')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('api/v1/admin')
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get('gamification/xp')
  @ApiOperation({ summary: 'Get XP distribution and analytics overview' })
  @ApiResponse({ status: 200, description: 'XP analytics retrieved successfully.' })
  getXpOverview() {
    return this.gamificationService.getXpOverview();
  }

  @Get('gamification/coins')
  @ApiOperation({ summary: 'Get coin economy distribution and analytics' })
  @ApiResponse({ status: 200, description: 'Coin analytics retrieved successfully.' })
  getCoinsOverview() {
    return this.gamificationService.getCoinsOverview();
  }

  @Get('gamification/streaks')
  @ApiOperation({ summary: 'Get student streaks distribution and analytics' })
  @ApiResponse({ status: 200, description: 'Streak analytics retrieved successfully.' })
  getStreaksOverview() {
    return this.gamificationService.getStreaksOverview();
  }

  @Get('gamification/leaderboards')
  @ApiOperation({ summary: 'Get global gamification leaderboard' })
  @ApiResponse({ status: 200, description: 'Leaderboard retrieved successfully.' })
  getLeaderboards(@Query() query: GamificationQueryDto) {
    return this.gamificationService.getLeaderboards(query);
  }

  @Post('users/:id/xp')
  @ApiOperation({ summary: 'Manually adjust user XP (requires reason and creates audit trail)' })
  @ApiResponse({ status: 200, description: 'User XP adjusted successfully and logged.' })
  adjustUserXp(@Param('id') id: string, @Body() dto: ManualAdjustmentDto, @Req() req: any) {
    return this.gamificationService.adjustUserXp(id, dto, req.user.id, req.user.email);
  }

  @Post('users/:id/coins')
  @ApiOperation({ summary: 'Manually adjust user coins (requires reason and creates audit trail)' })
  @ApiResponse({ status: 200, description: 'User coins adjusted successfully and logged.' })
  adjustUserCoins(@Param('id') id: string, @Body() dto: ManualAdjustmentDto, @Req() req: any) {
    return this.gamificationService.adjustUserCoins(id, dto, req.user.id, req.user.email);
  }
}