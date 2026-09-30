// src/admin/analytics/dto/analytics-query.dto.ts
import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AnalyticsQueryDto {
  @ApiPropertyOptional({ example: '30days', enum: ['7days', '30days', '90days', 'year'] })
  @IsOptional()
  @IsString()
  @IsIn(['7days', '30days', '90days', 'year'], { message: 'Period must be 7days, 30days, 90days, or year' })
  period?: string = '30days';
}