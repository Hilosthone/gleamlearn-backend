// src/admin/dashboard/dashboard.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';
import { DashboardMetric } from './entities/dashboard-metric.entity.js';
import { User } from '../../auth/entities/user.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([DashboardMetric, User])],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}