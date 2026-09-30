// src/admin/reports/dto/update-admin-report.dto.ts
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAdminReportDto {
  @ApiPropertyOptional({ example: 'Updated reason or categorization', description: 'Report reason' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ example: 'Additional reviewer notes or updated description', description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;
}