// // src/personal-ai-companion/personal-ai-companion.controller.ts
// import { Controller, Get, Post, Patch, Delete, Body, UseGuards } from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
// import { PersonalAiCompanionService } from './personal-ai-companion.service.js';
// import { UpsertAiCompanionDto } from './dto/ai-companion.dto.js';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
// import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

// @ApiTags('Personal AI Companion')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard) // Enforces verified token checks for all companion settings
// @Controller('api/v1/ai-companion')
// export class PersonalAiCompanionController {
//   constructor(private readonly companionService: PersonalAiCompanionService) {}

//   @Get()
//   @ApiOperation({ summary: 'Retrieve the authenticated user custom AI companion configuration' })
//   @ApiResponse({ status: 200, description: 'AI companion fetched successfully.' })
//   getCompanion(@CurrentUser() user: any) {
//     return this.companionService.getCompanion(user.id);
//   }

//   @Post()
//   @ApiOperation({ summary: 'Create a custom personal AI companion profile' })
//   @ApiResponse({ status: 201, description: 'AI companion created successfully.' })
//   createCompanion(@CurrentUser() user: any, @Body() dto: UpsertAiCompanionDto) {
//     return this.companionService.createCompanion(user.id, dto);
//   }

//   @Patch()
//   @ApiOperation({ summary: 'Update personal AI companion configuration' })
//   @ApiResponse({ status: 200, description: 'AI companion updated successfully.' })
//   updateCompanion(@CurrentUser() user: any, @Body() dto: UpsertAiCompanionDto) {
//     return this.companionService.updateCompanion(user.id, dto);
//   }

//   @Delete()
//   @ApiOperation({ summary: 'Delete custom personal AI companion setup' })
//   @ApiResponse({ status: 200, description: 'AI companion deleted successfully.' })
//   deleteCompanion(@CurrentUser() user: any) {
//     return this.companionService.deleteCompanion(user.id);
//   }
// }


// src/personal-ai-companion/personal-ai-companion.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PersonalAiCompanionService } from './personal-ai-companion.service.js';
import { UpsertAiCompanionDto } from './dto/ai-companion.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('Personal AI Companion')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard) // Enforces verified token checks for all companion settings
@Controller('api/v1/ai-companion')
export class PersonalAiCompanionController {
  constructor(private readonly companionService: PersonalAiCompanionService) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve the authenticated user custom AI companion configuration' })
  @ApiResponse({ status: 200, description: 'AI companion fetched successfully.' })
  getCompanion(@CurrentUser() user: any) {
    return this.companionService.getCompanion(user.id);
  }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 5, ttl: 60000 } })
  @Post()
  @ApiOperation({ summary: 'Create a custom personal AI companion profile' })
  @ApiResponse({ status: 201, description: 'AI companion created successfully.' })
  createCompanion(@CurrentUser() user: any, @Body() dto: UpsertAiCompanionDto) {
    return this.companionService.createCompanion(user.id, dto);
  }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 10, ttl: 60000 } })
  @Patch()
  @ApiOperation({ summary: 'Update personal AI companion configuration' })
  @ApiResponse({ status: 200, description: 'AI companion updated successfully.' })
  updateCompanion(@CurrentUser() user: any, @Body() dto: UpsertAiCompanionDto) {
    return this.companionService.updateCompanion(user.id, dto);
  }

  @Throttle({ short: { limit: 1, ttl: 5000 }, long: { limit: 5, ttl: 60000 } })
  @Delete()
  @ApiOperation({ summary: 'Delete custom personal AI companion setup' })
  @ApiResponse({ status: 200, description: 'AI companion deleted successfully.' })
  deleteCompanion(@CurrentUser() user: any) {
    return this.companionService.deleteCompanion(user.id);
  }
}