// //src/health/health.module.ts

import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';
import { SchemaReportService } from './schema-report.service.js';

@Module({
  controllers: [HealthController],
  providers: [HealthService, SchemaReportService],
})
export class HealthModule {}