import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AdminExportService } from './admin-export.service.js';
import { ExportQueryDto, ExportFormat } from './dto/export-query.dto.js';

@Controller('api/v1/admin/export')
export class AdminExportController {
  constructor(private readonly exportService: AdminExportService) {}

  @Get('users')
  async exportUsers(@Query() query: ExportQueryDto, @Res() res: Response) {
    const format = query.format ?? ExportFormat.JSON;
    return this.exportService.exportUsers(format, res);
  }

  @Get('analytics')
  async exportAnalytics(@Query() query: ExportQueryDto, @Res() res: Response) {
    const format = query.format ?? ExportFormat.JSON;
    return this.exportService.exportAnalytics(format, res);
  }

  @Get('transactions')
  async exportTransactions(@Query() query: ExportQueryDto, @Res() res: Response) {
    const format = query.format ?? ExportFormat.JSON;
    return this.exportService.exportTransactions(format, res);
  }

  @Get('activity')
  async exportActivity(@Query() query: ExportQueryDto, @Res() res: Response) {
    const format = query.format ?? ExportFormat.JSON;
    return this.exportService.exportActivity(format, res);
  }
}