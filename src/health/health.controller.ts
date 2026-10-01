import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service.js';

@Controller('api/v1/health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  checkHealth() {
    return this.healthService.getSystemHealth();
  }

  @Get('database')
  async checkDatabase() {
    return await this.healthService.checkDatabase();
  }

  @Get('redis')
  async checkRedis() {
    return await this.healthService.checkRedis();
  }

  @Get('ai')
  async checkAi() {
    return await this.healthService.checkAi();
  }
}