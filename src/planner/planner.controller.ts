// // src/planner/planner.controller.ts
// import { Controller, Get, Post, Patch, Param, Body, Request, UseGuards } from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
// import { PlannerService } from './planner.service.js';
// import { GeneratePlannerDto, UpdatePlannerItemDto } from './dto/study-planner.dto.js';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

// @ApiTags('AI Study Planner')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
// @Controller('api/v1/planner')
// export class PlannerController {
//   constructor(private readonly plannerService: PlannerService) {}

//   @Post('generate')
//   @ApiOperation({
//     summary: 'Generate initial AI study plan',
//     description: 'Triggers the AI scheduling engine to build a custom study roadmap based on target deadlines and subjects.'
//   })
//   @ApiResponse({ status: 201, description: 'Study plan generated successfully.' })
//   generate(@Request() req: any, @Body() dto: GeneratePlannerDto) {
//     return this.plannerService.generatePlanner(req.user.userId, dto);
//   }

//   @Get()
//   @ApiOperation({
//     summary: 'Retrieve all planner sessions',
//     description: 'Fetches the complete study schedule timeline for the authenticated user.'
//   })
//   @ApiResponse({ status: 200, description: 'Planner retrieved successfully.' })
//   getAllPlannerItems(@Request() req: any) {
//     return this.plannerService.getAllPlannerItems(req.user.userId);
//   }

//   @Get('today')
//   @ApiOperation({
//     summary: 'Get today study agenda',
//     description: 'Fetches all scheduled study sessions and tasks assigned for the current day.'
//   })
//   getTodayPlanner(@Request() req: any) {
//     return this.plannerService.getTodayPlanner(req.user.userId);
//   }

//   @Get('week')
//   @ApiOperation({
//     summary: 'Get weekly study schedule',
//     description: 'Fetches study sessions scheduled for the current week.'
//   })
//   getWeekPlanner(@Request() req: any) {
//     return this.plannerService.getWeekPlanner(req.user.userId);
//   }

//   @Get('month')
//   @ApiOperation({
//     summary: 'Get monthly study schedule',
//     description: 'Fetches study sessions scheduled across the current month.'
//   })
//   getMonthPlanner(@Request() req: any) {
//     return this.plannerService.getMonthPlanner(req.user.userId);
//   }

//   @Patch(':id')
//   @ApiOperation({
//     summary: 'Update study plan item',
//     description: 'Modifies specific properties, times, or dates of a scheduled study task.'
//   })
//   updateItem(@Request() req: any, @Param('id') id: string, @Body() dto: UpdatePlannerItemDto) {
//     return this.plannerService.updateItem(req.user.userId, id, dto);
//   }

//   @Post(':id/complete')
//   @ApiOperation({
//     summary: 'Mark study session as complete',
//     description: 'Updates a planner task status to completed and records learning milestone achievement.'
//   })
//   completeItem(@Request() req: any, @Param('id') id: string) {
//     return this.plannerService.completeItem(req.user.userId, id);
//   }

//   @Post(':id/skip')
//   @ApiOperation({
//     summary: 'Mark study session as skipped',
//     description: 'Flags a scheduled session as skipped so the AI planner can take it into account.'
//   })
//   skipItem(@Request() req: any, @Param('id') id: string) {
//     return this.plannerService.skipItem(req.user.userId, id);
//   }

//   @Post('regenerate')
//   @ApiOperation({
//     summary: 'Regenerate AI study plan (Backlog adjustment)',
//     description: 'Analyzes missed or skipped sessions (e.g. when a student misses multiple days) and dynamically rebuilds and redistributes the remaining study schedule.'
//   })
//   @ApiResponse({ status: 201, description: 'Study plan successfully recalculated and regenerated.' })
//   regeneratePlanner(@Request() req: any) {
//     return this.plannerService.regeneratePlanner(req.user.userId);
//   }
// }


// src/planner/planner.controller.ts
import { Controller, Get, Post, Patch, Param, Body, Request, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PlannerService } from './planner.service.js';
import { GeneratePlannerDto, UpdatePlannerItemDto } from './dto/study-planner.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@ApiTags('AI Study Planner')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/planner')
export class PlannerController {
  constructor(private readonly plannerService: PlannerService) {}

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 10, ttl: 60000 } })
  @Post('generate')
  @ApiOperation({
    summary: 'Generate initial AI study plan',
    description: 'Triggers the AI scheduling engine to build a custom study roadmap based on target deadlines and subjects.'
  })
  @ApiResponse({ status: 201, description: 'Study plan generated successfully.' })
  generate(@Request() req: any, @Body() dto: GeneratePlannerDto) {
    return this.plannerService.generatePlanner(req.user.userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Retrieve all planner sessions',
    description: 'Fetches the complete study schedule timeline for the authenticated user.'
  })
  @ApiResponse({ status: 200, description: 'Planner retrieved successfully.' })
  getAllPlannerItems(@Request() req: any) {
    return this.plannerService.getAllPlannerItems(req.user.userId);
  }

  @Get('today')
  @ApiOperation({
    summary: 'Get today study agenda',
    description: 'Fetches all scheduled study sessions and tasks assigned for the current day.'
  })
  getTodayPlanner(@Request() req: any) {
    return this.plannerService.getTodayPlanner(req.user.userId);
  }

  @Get('week')
  @ApiOperation({
    summary: 'Get weekly study schedule',
    description: 'Fetches study sessions scheduled for the current week.'
  })
  getWeekPlanner(@Request() req: any) {
    return this.plannerService.getWeekPlanner(req.user.userId);
  }

  @Get('month')
  @ApiOperation({
    summary: 'Get monthly study schedule',
    description: 'Fetches study sessions scheduled across the current month.'
  })
  getMonthPlanner(@Request() req: any) {
    return this.plannerService.getMonthPlanner(req.user.userId);
  }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 10, ttl: 60000 } })
  @Patch(':id')
  @ApiOperation({
    summary: 'Update study plan item',
    description: 'Modifies specific properties, times, or dates of a scheduled study task.'
  })
  updateItem(@Request() req: any, @Param('id') id: string, @Body() dto: UpdatePlannerItemDto) {
    return this.plannerService.updateItem(req.user.userId, id, dto);
  }

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 15, ttl: 60000 } })
  @Post(':id/complete')
  @ApiOperation({
    summary: 'Mark study session as complete',
    description: 'Updates a planner task status to completed and records learning milestone achievement.'
  })
  completeItem(@Request() req: any, @Param('id') id: string) {
    return this.plannerService.completeItem(req.user.userId, id);
  }

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 15, ttl: 60000 } })
  @Post(':id/skip')
  @ApiOperation({
    summary: 'Mark study session as skipped',
    description: 'Flags a scheduled session as skipped so the AI planner can take it into account.'
  })
  skipItem(@Request() req: any, @Param('id') id: string) {
    return this.plannerService.skipItem(req.user.userId, id);
  }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 5, ttl: 60000 } })
  @Post('regenerate')
  @ApiOperation({
    summary: 'Regenerate AI study plan (Backlog adjustment)',
    description: 'Analyzes missed or skipped sessions (e.g. when a student misses multiple days) and dynamically rebuilds and redistributes the remaining study schedule.'
  })
  @ApiResponse({ status: 201, description: 'Study plan successfully recalculated and regenerated.' })
  regeneratePlanner(@Request() req: any) {
    return this.plannerService.regeneratePlanner(req.user.userId);
  }
}