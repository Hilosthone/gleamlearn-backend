// src/study-sessions/dto/study-session.dto.ts
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StartStudySessionDto {
  @ApiProperty({ description: 'Title or topic of the study session', example: 'Advanced TypeScript Review' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Associated course ID', example: 'course_uuid_123', required: false })
  @IsString()
  @IsOptional()
  courseId?: string;
}