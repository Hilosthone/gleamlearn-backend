// // src/streak/streak.controller.ts
// import { Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
// import { StreakService } from './streak.service.js';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

// @ApiTags('Streaks')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
// @Controller('api/v1/streak')
// export class StreakController {
//   constructor(private readonly streakService: StreakService) {}

//   @Get()
//   @ApiOperation({
//     summary: 'Get current streak summary',
//     description: 'Fetches current streak count, longest streak, recovery token balance, and today check-in status.'
//   })
//   @ApiResponse({ status: 200, description: 'Streak summary retrieved successfully.' })
//   getStreakStatus(@Request() req: any) {
//     return this.streakService.getStreakStatus(req.user.userId);
//   }

//   @Get('history')
//   @ApiOperation({
//     summary: 'Get streak check-in history',
//     description: 'Retrieves chronological check-in logs for user engagement analysis.'
//   })
//   getStreakHistory(@Request() req: any) {
//     return this.streakService.getStreakHistory(req.user.userId);
//   }

//   @Get('calendar')
//   @ApiOperation({
//     summary: 'Get calendar check-in map',
//     description: 'Returns an array of dates when the student checked in, optimized for calendar grid UI widgets.'
//   })
//   getStreakCalendar(@Request() req: any) {
//     return this.streakService.getStreakCalendar(req.user.userId);
//   }

//   @Post('check-in')
//   @ApiOperation({
//     summary: 'Perform daily streak check-in',
//     description: 'Registers daily activity, increments consecutive streak counters, and updates records.'
//   })
//   @ApiResponse({ status: 201, description: 'Check-in registered successfully.' })
//   checkIn(@Request() req: any) {
//     return this.streakService.checkIn(req.user.userId);
//   }

//   @Get('recovery')
//   @ApiOperation({
//     summary: 'Check streak recovery availability',
//     description: 'Inspects if the student has available recovery tokens to restore a broken streak.'
//   })
//   getRecoveryStatus(@Request() req: any) {
//     return this.streakService.getRecoveryStatus(req.user.userId);
//   }

//   @Post('recover')
//   @ApiOperation({
//     summary: 'Recover a broken streak',
//     description: 'Consumes a recovery token to restore a missed streak day.'
//   })
//   @ApiResponse({ status: 201, description: 'Streak successfully restored.' })
//   recoverStreak(@Request() req: any) {
//     return this.streakService.recoverStreak(req.user.userId);
//   }
// }


// src/streak/streak.controller.ts
import { Controller, Get, Post, Body, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StreakService } from './streak.service.js';
import { CheckInDto, RecoverStreakDto } from './dto/streak.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@ApiTags('Streaks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/streak')
export class StreakController {
  constructor(private readonly streakService: StreakService) {}

  @Get()
  @ApiOperation({
    summary: 'Get current streak summary',
    description: 'Fetches current streak count, longest streak, recovery token balance, and today check-in status.'
  })
  @ApiResponse({ status: 200, description: 'Streak summary retrieved successfully.' })
  getStreakStatus(@Request() req: any) {
    return this.streakService.getStreakStatus(req.user.userId);
  }

  @Get('history')
  @ApiOperation({
    summary: 'Get streak check-in history',
    description: 'Retrieves chronological check-in logs for user engagement analysis.'
  })
  getStreakHistory(@Request() req: any) {
    return this.streakService.getStreakHistory(req.user.userId);
  }

  @Get('calendar')
  @ApiOperation({
    summary: 'Get calendar check-in map',
    description: 'Returns an array of dates when the student checked in, optimized for calendar grid UI widgets.'
  })
  getStreakCalendar(@Request() req: any) {
    return this.streakService.getStreakCalendar(req.user.userId);
  }

  @Post('check-in')
  @ApiOperation({
    summary: 'Perform daily streak check-in',
    description: 'Registers daily activity, increments consecutive streak counters, and updates records.'
  })
  @ApiResponse({ status: 201, description: 'Check-in registered successfully.' })
  checkIn(@Request() req: any, @Body() dto: CheckInDto) {
    return this.streakService.checkIn(req.user.userId, dto);
  }

  @Get('recovery')
  @ApiOperation({
    summary: 'Check streak recovery availability',
    description: 'Inspects if the student has available recovery tokens to restore a broken streak.'
  })
  getRecoveryStatus(@Request() req: any) {
    return this.streakService.getRecoveryStatus(req.user.userId);
  }

  @Post('recover')
  @ApiOperation({
    summary: 'Recover a broken streak',
    description: 'Consumes a recovery token to restore a missed streak day.'
  })
  @ApiResponse({ status: 201, description: 'Streak successfully restored.' })
  recoverStreak(@Request() req: any, @Body() dto: RecoverStreakDto) {
    return this.streakService.recoverStreak(req.user.userId, dto);
  }
}