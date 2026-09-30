// src/admin/dashboard/dto/dashboard-query.dto.ts
import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DashboardQueryDto {
  @ApiPropertyOptional({ example: 'monthly', enum: ['daily', 'weekly', 'monthly', 'yearly'] })
  @IsOptional()
  @IsString()
  @IsIn(['daily', 'weekly', 'monthly', 'yearly'], { message: 'Timeframe must be daily, weekly, monthly, or yearly' })
  timeframe?: string;
}