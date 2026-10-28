// src/reports/reports.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';
import { AdminReport } from '../admin/reports/entities/admin-report.entity.js';
import { LearnerFeedback } from './learner-feedback.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([AdminReport, LearnerFeedback])],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
