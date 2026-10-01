import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { SystemService } from './system.service.js';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt.guard.js';

@ApiTags('Admin System Monitoring')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('api/v1/admin/system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('health')
  @ApiOperation({ summary: 'Get core server health status, uptime, memory, and database connectivity' })
  @ApiResponse({ status: 200, description: 'Health diagnostics retrieved successfully.' })
  getHealth() {
    return this.systemService.getHealth();
  }

  @Get('queues')
  @ApiOperation({ summary: 'Monitor background worker and job queue statistics' })
  @ApiResponse({ status: 200, description: 'Queue metrics retrieved successfully.' })
  getQueues() {
    return this.systemService.getQueues();
  }

  @Get('storage')
  @ApiOperation({ summary: 'Get file storage bucket utilization and capacity breakdown' })
  @ApiResponse({ status: 200, description: 'Storage metrics retrieved successfully.' })
  getStorage() {
    return this.systemService.getStorage();
  }

  @Get('ai')
  @ApiOperation({ summary: 'Get AI service integration metrics, latency, and token consumption' })
  @ApiResponse({ status: 200, description: 'AI metrics retrieved successfully.' })
  getAiMetrics() {
    return this.systemService.getAiMetrics();
  }

  @Get('errors')
  @ApiOperation({ summary: 'Retrieve recent application error logs and runtime warnings' })
  @ApiResponse({ status: 200, description: 'Error logs retrieved successfully.' })
  getErrors() {
    return this.systemService.getErrors();
  }
}