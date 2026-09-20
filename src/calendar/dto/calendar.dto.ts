// src/calendar/dto/calendar.dto.ts
import { IsString, IsOptional, IsDateString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCalendarEventDto {
  @ApiProperty({ example: 'Advanced Calculus Study Session' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Review chapters 3 and 4 with AI Tutor' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '2026-09-25T10:00:00.000Z' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: '2026-09-25T11:30:00.000Z' })
  @IsDateString()
  endTime: string;

  @ApiPropertyOptional({ example: false, description: 'Mark true for full-day events' })
  @IsBoolean()
  @IsOptional()
  isAllDay?: boolean;
}

export class UpdateCalendarEventDto {
  @ApiPropertyOptional({ example: 'Updated Calculus Study Session' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: 'Updated description notes' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: '2026-09-25T10:30:00.000Z' })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ example: '2026-09-25T12:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isAllDay?: boolean;
}