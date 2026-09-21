// // src/gamification/controllers/achievements.controller.ts
// import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
// import { AuthGuard } from '@nestjs/passport';
// import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
// import { Request } from 'express';
// import { AchievementsService } from '../services/achievements.service.js';

// interface RequestWithUser extends Request {
//   user: { id: string; email: string };
// }

// @ApiTags('Achievements')
// @Controller('api/v1/achievements')
// export class AchievementsController {
//   constructor(private readonly achievementsService: AchievementsService) {}

//   @Get()
//   @ApiOperation({ summary: 'Get global achievements catalog' })
//   @ApiResponse({ status: 200, description: 'Achievements list fetched successfully.' })
//   findAll() {
//     return this.achievementsService.findAll();
//   }

//   @Get('me')
//   @ApiBearerAuth()
//   @UseGuards(AuthGuard('jwt'))
//   @ApiOperation({ summary: 'Get authenticated user unlocked achievements' })
//   @ApiResponse({ status: 200, description: 'User unlocked achievements fetched successfully.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   findUserAchievements(@Req() req: RequestWithUser) {
//     return this.achievementsService.findUserAchievements(req.user.id);
//   }

//   @Get(':id')
//   @ApiOperation({ summary: 'Get specific achievement details by unique ID' })
//   @ApiResponse({ status: 200, description: 'Achievement found.' })
//   @ApiResponse({ status: 404, description: 'Achievement not found.' })
//   findOne(@Param('id') id: string) {
//     return this.achievementsService.findOne(id);
//   }
// }



// src/gamification/controllers/achievements.controller.ts
import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AchievementsService } from '../services/achievements.service.js';

interface RequestWithUser extends Request {
  user: { id: string; email: string };
}

@ApiTags('Achievements')
@Controller('api/v1/achievements')
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Throttle({ short: { limit: 2, ttl: 2000 }, long: { limit: 20, ttl: 60000 } })
  @Get()
  @ApiOperation({ summary: 'Get global achievements catalog' })
  @ApiResponse({ status: 200, description: 'Achievements list fetched successfully.' })
  findAll() {
    return this.achievementsService.findAll();
  }

  @Throttle({ short: { limit: 2, ttl: 2000 }, long: { limit: 20, ttl: 60000 } })
  @Get('me')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get authenticated user unlocked achievements' })
  @ApiResponse({ status: 200, description: 'User unlocked achievements fetched successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findUserAchievements(@Req() req: RequestWithUser) {
    return this.achievementsService.findUserAchievements(req.user.id);
  }

  @Throttle({ short: { limit: 2, ttl: 2000 }, long: { limit: 30, ttl: 60000 } })
  @Get(':id')
  @ApiOperation({ summary: 'Get specific achievement details by unique ID' })
  @ApiResponse({ status: 200, description: 'Achievement found.' })
  @ApiResponse({ status: 404, description: 'Achievement not found.' })
  findOne(@Param('id') id: string) {
    return this.achievementsService.findOne(id);
  }
}