// src/streak/dto/streak.dto.ts
import { IsOptional, IsString } from 'class-validator';
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
}