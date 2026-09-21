// // src/xp/xp.controller.ts
// import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
// import { AuthGuard } from '@nestjs/passport';
// import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
// import { Request } from 'express';
// import { XpService } from './xp.service.js';
// import { AwardXpDto } from './dto/award-xp.dto.js';

// interface RequestWithUser extends Request {
//   user: {
//     id: string;
//     email: string;
//   };
// }

// @ApiTags('XP & Gamification')
// @ApiBearerAuth()
// @UseGuards(AuthGuard('jwt'))
// @Controller('api/v1/xp')
// export class XpController {
//   constructor(private readonly xpService: XpService) {}

//   @Get()
//   @ApiOperation({ 
//     summary: 'Get XP Overview', 
//     description: 'Retrieves the authenticated user total accumulated XP points, current level, and progress metrics toward the next level.' 
//   })
//   @ApiResponse({ status: 200, description: 'Successfully retrieved XP summary.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized user token.' })
//   async getXpOverview(@Req() req: RequestWithUser) {
//     return await this.xpService.getUserXpSummary(req.user.id);
//   }

//   @Get('level')
//   @ApiOperation({ 
//     summary: 'Get Level Details', 
//     description: 'Fetches detailed tier breakdown including current level, leftover current XP, and threshold required for the next level upgrade.' 
//   })
//   @ApiResponse({ status: 200, description: 'Successfully retrieved level details.' })
//   async getLevelDetails(@Req() req: RequestWithUser) {
//     return await this.xpService.getUserXpSummary(req.user.id);
//   }

//   @Get('history')
//   @ApiOperation({ 
//     summary: 'Get XP History', 
//     description: 'Returns a chronological ledger of all historical experience point changes and reward grants for the user.' 
//   })
//   @ApiResponse({ status: 200, description: 'Successfully retrieved XP history records.' })
//   async getHistory(@Req() req: RequestWithUser) {
//     return await this.xpService.getXpHistory(req.user.id);
//   }

//   @Get('transactions')
//   @ApiOperation({ 
//     summary: 'Get XP Transactions', 
//     description: 'Alias endpoint returning full list of ledger activity entries for point auditing.' 
//   })
//   @ApiResponse({ status: 200, description: 'Successfully retrieved transactions list.' })
//   async getTransactions(@Req() req: RequestWithUser) {
//     return await this.xpService.getXpHistory(req.user.id);
//   }

//   @Post('award')
//   @ApiOperation({ 
//     summary: 'Award XP to User (Admin)', 
//     description: 'Administrative endpoint to manually grant experience points to a target user account.' 
//   })
//   @ApiResponse({ status: 201, description: 'XP successfully awarded and recorded.' })
//   @ApiResponse({ status: 400, description: 'Invalid payload or validation error.' })
//   async awardXpToUser(@Body() dto: AwardXpDto) {
//     return await this.xpService.awardXp(
//       dto.userId,
//       dto.amount,
//       dto.source,
//       dto.description || 'Awarded via admin endpoint'
//     );
//   }
// }




// src/xp/xp.controller.ts
import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { XpService } from './xp.service.js';
import { AwardXpDto } from './dto/award-xp.dto.js';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
  };
}

@ApiTags('XP & Gamification')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/xp')
export class XpController {
  constructor(private readonly xpService: XpService) {}

  @Throttle({ short: { limit: 2, ttl: 2000 }, long: { limit: 20, ttl: 60000 } })
  @Get()
  @ApiOperation({ 
    summary: 'Get XP Overview', 
    description: 'Retrieves the authenticated user total accumulated XP points, current level, and progress metrics toward the next level.' 
  })
  @ApiResponse({ status: 200, description: 'Successfully retrieved XP summary.' })
  @ApiResponse({ status: 401, description: 'Unauthorized user token.' })
  async getXpOverview(@Req() req: RequestWithUser) {
    return await this.xpService.getUserXpSummary(req.user.id);
  }

  @Throttle({ short: { limit: 2, ttl: 2000 }, long: { limit: 20, ttl: 60000 } })
  @Get('level')
  @ApiOperation({ 
    summary: 'Get Level Details', 
    description: 'Fetches detailed tier breakdown including current level, leftover current XP, and threshold required for the next level upgrade.' 
  })
  @ApiResponse({ status: 200, description: 'Successfully retrieved level details.' })
  async getLevelDetails(@Req() req: RequestWithUser) {
    return await this.xpService.getUserXpSummary(req.user.id);
  }

  @Throttle({ short: { limit: 2, ttl: 2000 }, long: { limit: 15, ttl: 60000 } })
  @Get('history')
  @ApiOperation({ 
    summary: 'Get XP History', 
    description: 'Returns a chronological ledger of all historical experience point changes and reward grants for the user.' 
  })
  @ApiResponse({ status: 200, description: 'Successfully retrieved XP history records.' })
  async getHistory(@Req() req: RequestWithUser) {
    return await this.xpService.getXpHistory(req.user.id);
  }

  @Throttle({ short: { limit: 2, ttl: 2000 }, long: { limit: 15, ttl: 60000 } })
  @Get('transactions')
  @ApiOperation({ 
    summary: 'Get XP Transactions', 
    description: 'Alias endpoint returning full list of ledger activity entries for point auditing.' 
  })
  @ApiResponse({ status: 200, description: 'Successfully retrieved transactions list.' })
  async getTransactions(@Req() req: RequestWithUser) {
    return await this.xpService.getXpHistory(req.user.id);
  }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 10, ttl: 60000 } })
  @Post('award')
  @ApiOperation({ 
    summary: 'Award XP to User (Admin)', 
    description: 'Administrative endpoint to manually grant experience points to a target user account.' 
  })
  @ApiResponse({ status: 201, description: 'XP successfully awarded and recorded.' })
  @ApiResponse({ status: 400, description: 'Invalid payload or validation error.' })
  async awardXpToUser(@Body() dto: AwardXpDto) {
    return await this.xpService.awardXp(
      dto.userId,
      dto.amount,
      dto.source,
      dto.description || 'Awarded via admin endpoint'
    );
  }
}