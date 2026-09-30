// src/admin/reports/reports.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';
import { AdminReport } from './entities/admin-report.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([AdminReport])],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}