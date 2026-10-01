import { IsOptional, IsInt, Min, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AuditQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ example: 'USERS', description: 'Filter logs by category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'MANUAL_COIN_ADJUSTMENT', description: 'Filter logs by action type' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ example: '087f0ab8-92eb-4989-b56a-ec344dfab750', description: 'Filter by specific admin ID' })
  @IsOptional()
  @IsUUID()
  adminId?: string;
}