// // src/usage/usage.controller.ts
// import { Controller, Get, UseGuards } from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
// import { UsageService } from './usage.service.js';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
// import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

// @ApiTags('Usage Limits')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
// @Controller('api/v1/usage')
// export class UsageController {
//   constructor(private readonly usageService: UsageService) {}

//   @Get()
//   @ApiOperation({ summary: 'Get overall account usage overview and quotas' })
//   @ApiResponse({ status: 200, description: 'Usage overview retrieved successfully.' })
//   async getUsageOverview(@CurrentUser() user: any) {
//     return this.usageService.getUsageOverview(user.id);
//   }

//   @Get('ai')
//   @ApiOperation({ summary: 'Get AI generation usage and daily limits' })
//   @ApiResponse({ status: 200, description: 'AI usage statistics retrieved successfully.' })
//   async getAiUsage(@CurrentUser() user: any) {
//     return this.usageService.getAiUsage(user.id);
//   }

//   @Get('documents')
//   @ApiOperation({ summary: 'Get document generation and upload usage metrics' })
//   @ApiResponse({ status: 200, description: 'Document usage metrics retrieved successfully.' })
//   async getDocumentUsage(@CurrentUser() user: any) {
//     return this.usageService.getDocumentUsage(user.id);
//   }

//   @Get('quizzes')
//   @ApiOperation({ summary: 'Get quiz generation and attempt usage stats' })
//   @ApiResponse({ status: 200, description: 'Quiz usage stats retrieved successfully.' })
//   async getQuizUsage(@CurrentUser() user: any) {
//     return this.usageService.getQuizUsage(user.id);
//   }
// }


// src/usage/usage.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsageService } from './usage.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('Usage Limits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/usage')
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Throttle({ short: { limit: 2, ttl: 2000 }, long: { limit: 20, ttl: 60000 } })
  @Get()
  @ApiOperation({ summary: 'Get overall account usage overview and quotas' })
  @ApiResponse({ status: 200, description: 'Usage overview retrieved successfully.' })
  async getUsageOverview(@CurrentUser() user: any) {
    return this.usageService.getUsageOverview(user.id);
  }

  @Throttle({ short: { limit: 2, ttl: 2000 }, long: { limit: 20, ttl: 60000 } })
  @Get('ai')
  @ApiOperation({ summary: 'Get AI generation usage and daily limits' })
  @ApiResponse({ status: 200, description: 'AI usage statistics retrieved successfully.' })
  async getAiUsage(@CurrentUser() user: any) {
    return this.usageService.getAiUsage(user.id);
  }

  @Throttle({ short: { limit: 2, ttl: 2000 }, long: { limit: 20, ttl: 60000 } })
  @Get('documents')
  @ApiOperation({ summary: 'Get document generation and upload usage metrics' })
  @ApiResponse({ status: 200, description: 'Document usage metrics retrieved successfully.' })
  async getDocumentUsage(@CurrentUser() user: any) {
    return this.usageService.getDocumentUsage(user.id);
  }

  @Throttle({ short: { limit: 2, ttl: 2000 }, long: { limit: 20, ttl: 60000 } })
  @Get('quizzes')
  @ApiOperation({ summary: 'Get quiz generation and attempt usage stats' })
  @ApiResponse({ status: 200, description: 'Quiz usage stats retrieved successfully.' })
  async getQuizUsage(@CurrentUser() user: any) {
    return this.usageService.getQuizUsage(user.id);
  }
}