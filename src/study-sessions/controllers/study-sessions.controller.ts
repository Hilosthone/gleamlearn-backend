// // src/study-sessions/controllers/study-sessions.controller.ts
// import { Controller, Get, Post, Param, Body, Request, UseGuards } from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
// import { StudySessionsService } from '../services/study-sessions.service.js';
// import { StartStudySessionDto } from '../dto/study-session.dto.js';
// import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';

// @ApiTags('Study Sessions')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
// @Controller('api/v1/study-sessions')
// export class StudySessionsController {
//   constructor(private readonly sessionsService: StudySessionsService) {}

//   @Post('start')
//   @ApiOperation({
//     summary: 'Start a live study session',
//     description: 'Initializes a live proctored or tracked study session timer for the student.'
//   })
//   @ApiResponse({ status: 201, description: 'Study session started successfully.' })
//   startSession(@Request() req: any, @Body() dto: StartStudySessionDto) {
//     return this.sessionsService.startSession(req.user.userId, dto);
//   }

//   @Post(':id/pause')
//   @ApiOperation({
//     summary: 'Pause an active study session',
//     description: 'Pauses the timing accumulator for an active study session.'
//   })
//   pauseSession(@Request() req: any, @Param('id') id: string) {
//     return this.sessionsService.pauseSession(req.user.userId, id);
//   }

//   @Post(':id/resume')
//   @ApiOperation({
//     summary: 'Resume a paused study session',
//     description: 'Resumes tracking time for a paused study session.'
//   })
//   resumeSession(@Request() req: any, @Param('id') id: string) {
//     return this.sessionsService.resumeSession(req.user.userId, id);
//   }

//   @Post(':id/complete')
//   @ApiOperation({
//     summary: 'Complete a study session',
//     description: 'Finalizes a study session, calculates total accumulated duration, and records metrics.'
//   })
//   completeSession(@Request() req: any, @Param('id') id: string) {
//     return this.sessionsService.completeSession(req.user.userId, id);
//   }

//   @Get()
//   @ApiOperation({
//     summary: 'Retrieve all study sessions',
//     description: 'Fetches the complete history of all sessions (active, paused, completed) for the user.'
//   })
//   findAllSessions(@Request() req: any) {
//     return this.sessionsService.findAllSessions(req.user.userId);
//   }

//   @Get('today')
//   @ApiOperation({
//     summary: 'Get today study sessions and totals',
//     description: 'Fetches all sessions logged for the current day alongside daily aggregate study duration.'
//   })
//   getTodaySessions(@Request() req: any) {
//     return this.sessionsService.getTodaySessions(req.user.userId);
//   }

//   @Get('history')
//   @ApiOperation({
//     summary: 'Get completed study session history',
//     description: 'Retrieves chronological records of all successfully completed study sessions.'
//   })
//   getHistory(@Request() req: any) {
//     return this.sessionsService.getHistory(req.user.userId);
//   }

//   @Get('stats')
//   @ApiOperation({
//     summary: 'Get overall study time statistics',
//     description: 'Calculates aggregate metrics including total completed sessions and total study hours.'
//   })
//   getStats(@Request() req: any) {
//     return this.sessionsService.getStats(req.user.userId);
//   }
// }



// src/study-sessions/controllers/study-sessions.controller.ts
import { Controller, Get, Post, Param, Body, Request, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StudySessionsService } from '../services/study-sessions.service.js';
import { StartStudySessionDto } from '../dto/study-session.dto.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';

@ApiTags('Study Sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/study-sessions')
export class StudySessionsController {
  constructor(private readonly sessionsService: StudySessionsService) {}

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 15, ttl: 60000 } })
  @Post('start')
  @ApiOperation({
    summary: 'Start a live study session',
    description: 'Initializes a live proctored or tracked study session timer for the student.'
  })
  @ApiResponse({ status: 201, description: 'Study session started successfully.' })
  startSession(@Request() req: any, @Body() dto: StartStudySessionDto) {
    return this.sessionsService.startSession(req.user.userId, dto);
  }

  @Throttle({ short: { limit: 1, ttl: 1000 }, long: { limit: 30, ttl: 60000 } })
  @Post(':id/pause')
  @ApiOperation({
    summary: 'Pause an active study session',
    description: 'Pauses the timing accumulator for an active study session.'
  })
  pauseSession(@Request() req: any, @Param('id') id: string) {
    return this.sessionsService.pauseSession(req.user.userId, id);
  }

  @Throttle({ short: { limit: 1, ttl: 1000 }, long: { limit: 30, ttl: 60000 } })
  @Post(':id/resume')
  @ApiOperation({
    summary: 'Resume a paused study session',
    description: 'Resumes tracking time for a paused study session.'
  })
  resumeSession(@Request() req: any, @Param('id') id: string) {
    return this.sessionsService.resumeSession(req.user.userId, id);
  }

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 15, ttl: 60000 } })
  @Post(':id/complete')
  @ApiOperation({
    summary: 'Complete a study session',
    description: 'Finalizes a study session, calculates total accumulated duration, and records metrics.'
  })
  completeSession(@Request() req: any, @Param('id') id: string) {
    return this.sessionsService.completeSession(req.user.userId, id);
  }

  @Get()
  @ApiOperation({
    summary: 'Retrieve all study sessions',
    description: 'Fetches the complete history of all sessions (active, paused, completed) for the user.'
  })
  findAllSessions(@Request() req: any) {
    return this.sessionsService.findAllSessions(req.user.userId);
  }

  @Get('today')
  @ApiOperation({
    summary: 'Get today study sessions and totals',
    description: 'Fetches all sessions logged for the current day alongside daily aggregate study duration.'
  })
  getTodaySessions(@Request() req: any) {
    return this.sessionsService.getTodaySessions(req.user.userId);
  }

  @Get('history')
  @ApiOperation({
    summary: 'Get completed study session history',
    description: 'Retrieves chronological records of all successfully completed study sessions.'
  })
  getHistory(@Request() req: any) {
    return this.sessionsService.getHistory(req.user.userId);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get overall study time statistics',
    description: 'Calculates aggregate metrics including total completed sessions and total study hours.'
  })
  getStats(@Request() req: any) {
    return this.sessionsService.getStats(req.user.userId);
  }
}