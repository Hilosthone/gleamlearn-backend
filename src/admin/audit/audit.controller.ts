import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuditService } from './audit.service.js';
import { AuditQueryDto } from './dto/audit-query.dto.js';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt.guard.js';

@ApiTags('Admin Audit Logs')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('api/v1/admin/audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'List all platform audit logs with pagination and filters (category, action, adminId)' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully.' })
  findAll(@Query() query: AuditQueryDto) {
    return this.auditService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details for a specific audit log entry by ID' })
  @ApiResponse({ status: 200, description: 'Audit log details retrieved successfully.' })
  findOne(@Param('id') id: string) {
    return this.auditService.findOne(id);
  }
}