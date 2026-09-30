// src/admin/ai-moderation/dto/ai-content-query.dto.ts
import { IsOptional, IsInt, Min, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AiContentQueryDto {
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

  @ApiPropertyOptional({ example: 'PENDING', enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  @IsOptional()
  @IsString()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED'])
  status?: string;
}