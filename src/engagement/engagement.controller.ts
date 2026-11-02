import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { EngagementService } from './engagement.service.js';

export class HeartbeatDto {
  /** false when the page is hidden or the learner is idle: the clock stops. Defaults to true. */
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

@ApiTags('Engagement')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/engagement')
export class EngagementController {
  constructor(private readonly engagement: EngagementService) {}

  @Throttle({ short: { limit: 2, ttl: 3000 }, long: { limit: 12, ttl: 60000 } })
  @Post('daily')
  @ApiOperation({ summary: 'Daily visit: counts today for the streak and grants the daily reward once (idempotent)' })
  daily(@CurrentUser('id') userId: string) {
    return this.engagement.dailyVisit(userId);
  }

  // a heartbeat a minute per tab; extra ones are refused, and the server credits wall-clock time only
  @Throttle({ short: { limit: 2, ttl: 10000 }, long: { limit: 8, ttl: 60000 } })
  @Post('heartbeat')
  @ApiOperation({ summary: 'Active-time heartbeat: the server credits time and grants 10-minute rewards (capped daily)' })
  heartbeat(@CurrentUser('id') userId: string, @Body() dto: HeartbeatDto) {
    return this.engagement.heartbeat(userId, dto?.active !== false);
  }

  @Throttle({ short: { limit: 2, ttl: 2000 }, long: { limit: 20, ttl: 60000 } })
  @Get('today')
  @ApiOperation({ summary: "Today's engagement: visit reward, active time and recent rewards" })
  today(@CurrentUser('id') userId: string) {
    return this.engagement.today(userId);
  }
}
