// src/throttler/throttler.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@ApiTags('Rate Limiting & Protection')
@Controller('api/v1/throttler')
export class ThrottlerStatusController {
  @Get('status')
  @ApiOperation({ summary: 'Get current API rate limiting policies and status' })
  @ApiResponse({ status: 200, description: 'Rate limit policies retrieved successfully.' })
  async getThrottlerStatus() {
    return {
      enabled: true,
      policies: {
        globalShortWindow: { ttlMs: 1000, maxRequests: 3 },
        globalLongWindow: { ttlMs: 60000, maxRequests: 60 },
        strictEndpoints: ['/api/v1/auth/login', '/api/v1/ai/generate', '/api/v1/payments/initialize'],
      },
    };
  }
}