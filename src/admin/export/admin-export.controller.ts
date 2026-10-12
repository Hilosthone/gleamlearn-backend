import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AdminExportService } from './admin-export.service.js';
import { ExportQueryDto, ExportFormat } from './dto/export-query.dto.js';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt.guard.js';
import { AdminPermission, RequireAdminPermission } from '../auth/admin-permissions.js';

// SECURITY: these routes export user PII and platform data; admin authentication is mandatory
@UseGuards(AdminJwtAuthGuard)
@Controller('api/v1/admin/export')
export class AdminExportController {
  constructor(private readonly exportService: AdminExportService) {}

  @RequireAdminPermission(AdminPermission.DATA_EXPORT)
  @Get('users')
  async exportUsers(@Query() query: ExportQueryDto, @Res() res: Response) {
    const format = query.format ?? ExportFormat.JSON;
    return this.exportService.exportUsers(format, res);
  }

  @RequireAdminPermission(AdminPermission.DATA_EXPORT)
  @Get('analytics')
  async exportAnalytics(@Query() query: ExportQueryDto, @Res() res: Response) {
    const format = query.format ?? ExportFormat.JSON;
    return this.exportService.exportAnalytics(format, res);
  }

  @RequireAdminPermission(AdminPermission.DATA_EXPORT)
  @Get('transactions')
  async exportTransactions(@Query() query: ExportQueryDto, @Res() res: Response) {
    const format = query.format ?? ExportFormat.JSON;
    return this.exportService.exportTransactions(format, res);
  }

  @RequireAdminPermission(AdminPermission.DATA_EXPORT)
  @Get('activity')
  async exportActivity(@Query() query: ExportQueryDto, @Res() res: Response) {
    const format = query.format ?? ExportFormat.JSON;
    return this.exportService.exportActivity(format, res);
  }
}