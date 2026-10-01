import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminExportController } from './admin-export.controller.js';
import { AdminExportService } from './admin-export.service.js';
import { User } from '../../auth/entities/user.entity.js';
import { ActivityLog } from '../activity/entities/activity-log.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([User, ActivityLog])],
  controllers: [AdminExportController],
  providers: [AdminExportService],
})
export class AdminExportModule {}