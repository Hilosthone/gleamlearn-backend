// src/admin/questions/dto/admin-questions-query.dto.ts
import { IsOptional, IsInt, Min, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AdminQuestionsQueryDto {
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

  @ApiPropertyOptional({ example: 'Dependency Injection', description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'PENDING', enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  @IsOptional()
  @IsString()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED'])
  status?: string;
}