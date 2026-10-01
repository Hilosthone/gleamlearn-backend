import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from './entities/system-setting.entity.js';
import { UpdateSystemSettingsDto } from './dto/update-system-settings.dto.js';
import { ActivityLog } from '../activity/entities/activity-log.entity.js';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SystemSetting)
    private readonly settingsRepo: Repository<SystemSetting>,
    @InjectRepository(ActivityLog)
    private readonly auditRepo: Repository<ActivityLog>,
  ) {}

  async getSettings() {
    let settings = await this.settingsRepo.findOne({ where: {} });
    if (!settings) {
      // Seed default settings row if none exists
      settings = this.settingsRepo.create();
      await this.settingsRepo.save(settings);
    }
    return {
      status: 'success',
      data: settings,
    };
  }

  async updateSettings(dto: UpdateSystemSettingsDto, adminId: string) {
    let settings = await this.settingsRepo.findOne({ where: {} });
    if (!settings) {
      settings = this.settingsRepo.create();
    }

    // Merge incoming changes
    Object.assign(settings, dto);
    const updated = await this.settingsRepo.save(settings);

    // Create audit log for config changes
    const auditLog = this.auditRepo.create({
      adminId,
      category: 'SYSTEM',
      action: 'UPDATE_SYSTEM_SETTINGS',
      target: 'SystemSettings Singleton',
      details: JSON.stringify(dto),
      ipAddress: '127.0.0.1',
    });
    await this.auditRepo.save(auditLog);

    return {
      status: 'success',
      message: 'System configurations updated successfully',
      data: updated,
    };
  }
}