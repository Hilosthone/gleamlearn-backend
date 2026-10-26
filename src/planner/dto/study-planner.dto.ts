// src/planner/dto/study-planner.dto.ts
import { IsNotEmpty, IsOptional, IsString, IsDateString, IsArray, IsIn, Matches, MaxLength } from 'class-validator';
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

export const PLANNER_ACTIVITY_TYPES = ['study', 'quiz_practice', 'revision', 'exam_prep'] as const;

/** One session the learner adds to their own plan. */
export class CreatePlannerItemDto {
  @ApiProperty({ example: 'Revise cell biology' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: '2026-11-02' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'scheduledDate must be YYYY-MM-DD' })
  @IsDateString()
  scheduledDate: string;

  @ApiProperty({ example: '09:00', required: false })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime must be HH:MM (24-hour)' })
  startTime?: string;

  @ApiProperty({ example: '10:30', required: false })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'endTime must be HH:MM (24-hour)' })
  endTime?: string;

  @ApiProperty({ enum: PLANNER_ACTIVITY_TYPES, required: false })
  @IsOptional()
  @IsIn(PLANNER_ACTIVITY_TYPES)
  activityType?: string;
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