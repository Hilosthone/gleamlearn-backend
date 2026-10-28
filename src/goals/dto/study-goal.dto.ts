// src/goals/dto/study-goal.dto.ts
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsDateString, Min, Max, MaxLength } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateStudyGoalDto {
  @ApiProperty({ description: 'Title of the study goal', example: 'Master NestJS Architecture' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: 'Detailed description of the goal', example: 'Complete all backend modules and pass practice exams.' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ description: 'Category of goal', example: 'course_completion' })
  @IsString()
  @IsOptional()
  goalType?: string;

  @ApiProperty({ description: 'Target value to reach', example: 100 })
  @IsNumber()
  @IsOptional()
  targetValue?: number;

  @ApiProperty({ description: 'Target deadline date (YYYY-MM-DD)', example: '2026-12-31' })
  @IsDateString()
  @IsOptional()
  targetDate?: string;
}

export class UpdateStudyGoalDto extends PartialType(CreateStudyGoalDto) {
  // Progress towards targetValue (e.g. 6 of 10 hours). Without it a goal could only be 0% or completed.
  @ApiProperty({ description: 'Progress so far, in the same unit as targetValue', example: 6, required: false })
  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  @IsOptional()
  currentValue?: number;
}