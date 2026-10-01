import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsController } from './settings.controller.js';
import { SettingsService } from './settings.service.js';
import { SystemSetting } from './entities/system-setting.entity.js';
import { ActivityLog } from '../activity/entities/activity-log.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([SystemSetting, ActivityLog])],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class AdminSettingsModule {}