import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { SettingsService } from './settings.service.js';
import { UpdateSystemSettingsDto } from './dto/update-system-settings.dto.js';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt.guard.js';

@ApiTags('Admin System Configuration')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('api/v1/admin/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve current platform-wide system settings and configuration limits' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully.' })
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Patch()
  @ApiOperation({ summary: 'Update system configuration values (XP/Coin tables, AI limits, maintenance mode, etc.)' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully and logged.' })
  updateSettings(@Body() dto: UpdateSystemSettingsDto, @Req() req: any) {
    return this.settingsService.updateSettings(dto, req.user.id);
  }
}