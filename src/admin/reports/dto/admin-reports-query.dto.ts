// src/admin/reports/dto/admin-reports-query.dto.ts
import { IsOptional, IsInt, Min, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AdminReportsQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ example: 'PENDING', enum: ['PENDING', 'RESOLVED', 'REJECTED'] })
  @IsOptional()
  @IsString()
  @IsIn(['PENDING', 'RESOLVED', 'REJECTED'])
  status?: string;

  @ApiPropertyOptional({ example: 'COURSE', description: 'Filter by reported item type' })
  @IsOptional()
  @IsString()
  reportedItemType?: string;
}