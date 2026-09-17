// src/planner/dto/study-planner.dto.ts
import { IsNotEmpty, IsOptional, IsString, IsDateString, IsArray } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class GeneratePlannerDto {
  @ApiProperty({ description: 'Target curriculum, course ID, or subjects to study', example: 'course_uuid_123' })
  @IsString()
  @IsNotEmpty()
  targetId: string;

  @ApiProperty({ description: 'Target exam date or deadline', example: '2026-12-15' })
  @IsDateString()
  @IsNotEmpty()
  deadline: string;

  @ApiProperty({ description: 'Preferred study days or intensity level', example: 'intensive', required: false })
  @IsString()
  @IsOptional()
  intensity?: string;
}

export class UpdatePlannerItemDto {
  @ApiProperty({ description: 'Title of the scheduled session', example: 'Advanced NestJS Guards & Interceptors', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ description: 'Scheduled date (YYYY-MM-DD)', example: '2026-09-20', required: false })
  @IsDateString()
  @IsOptional()
  scheduledDate?: string;

  @ApiProperty({ description: 'Start time slot', example: '10:00 AM', required: false })
  @IsString()
  @IsOptional()
  startTime?: string;

  @ApiProperty({ description: 'End time slot', example: '11:30 AM', required: false })
  @IsString()
  @IsOptional()
  endTime?: string;
}