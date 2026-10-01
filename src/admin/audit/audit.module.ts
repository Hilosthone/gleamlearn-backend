import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditController } from './audit.controller.js';
import { AuditService } from './audit.service.js';
import { ActivityLog } from '../activity/entities/activity-log.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([ActivityLog])],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AdminAuditModule {}