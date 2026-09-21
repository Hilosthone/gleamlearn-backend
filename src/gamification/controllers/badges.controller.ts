// // src/gamification/controllers/badges.controller.ts
// import { Controller, Get, UseGuards, Req } from '@nestjs/common';
// import { AuthGuard } from '@nestjs/passport';
// import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
// import { Request } from 'express';
// import { BadgesService } from '../services/badges.service.js';

// interface RequestWithUser extends Request {
//   user: { id: string; email: string };
// }

// @ApiTags('Badges')
// @Controller('api/v1/badges')
// export class BadgesController {
//   constructor(private readonly badgesService: BadgesService) {}

//   @Get()
//   @ApiOperation({ summary: 'Get all system available badges' })
//   @ApiResponse({ status: 200, description: 'Badges catalog fetched successfully.' })
//   findAll() {
//     return this.badgesService.findAll();
//   }

//   @Get('me')
//   @ApiBearerAuth()
//   @UseGuards(AuthGuard('jwt'))
//   @ApiOperation({ summary: 'Get authenticated user unlocked badges' })
//   @ApiResponse({ status: 200, description: 'User earned badges fetched successfully.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   findUserBadges(@Req() req: RequestWithUser) {
//     return this.badgesService.findUserBadges(req.user.id);
//   }
// }



// src/gamification/controllers/badges.controller.ts
import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { BadgesService } from '../services/badges.service.js';

interface RequestWithUser extends Request {
  user: { id: string; email: string };
}

@ApiTags('Badges')
@Controller('api/v1/badges')
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  @Throttle({ short: { limit: 2, ttl: 2000 }, long: { limit: 20, ttl: 60000 } })
  @Get()
  @ApiOperation({ summary: 'Get all system available badges' })
  @ApiResponse({ status: 200, description: 'Badges catalog fetched successfully.' })
  findAll() {
    return this.badgesService.findAll();
  }

  @Throttle({ short: { limit: 2, ttl: 2000 }, long: { limit: 20, ttl: 60000 } })
  @Get('me')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get authenticated user unlocked badges' })
  @ApiResponse({ status: 200, description: 'User earned badges fetched successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findUserBadges(@Req() req: RequestWithUser) {
    return this.badgesService.findUserBadges(req.user.id);
  }
}