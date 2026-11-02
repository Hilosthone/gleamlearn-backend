// src/streak/dto/streak.dto.ts
import { IsOptional, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckInDto {
  @ApiProperty({ description: 'Optional source activity triggering the check-in', example: 'study_session', required: false })
  @IsString()
  @IsOptional()
  activitySource?: string;
}

export class RecoverStreakDto {
  @ApiProperty({ description: 'Optional reason or token ID used for recovery', example: 'standard_token', required: false })
  @IsString()
  @IsOptional()
  recoveryMethod?: string;

  @ApiProperty({ description: 'The missed day being recovered (YYYY-MM-DD), as shown to the learner. Makes a repeated request harmless.', example: '2026-11-01', required: false })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  missedDate?: string;
}