// src/progress/dto/update-progress.dto.ts
import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProgressDto {
  @ApiProperty({ description: 'Unique ID of the course', example: 'course_uuid_123' })
  @IsString()
  @IsNotEmpty()
  courseId: string;

  @ApiProperty({ description: 'Unique ID of the topic or lesson', example: 'topic_uuid_456' })
  @IsString()
  @IsOptional()
  topicId?: string;

  @ApiProperty({ description: 'New completion percentage (0 - 100)', example: 85.0 })
  @IsNumber()
  @Min(0)
  @Max(100)
  completionPercentage: number;

  @ApiProperty({ description: 'Description of the last activity performed', example: 'Completed Module 3 Quiz' })
  @IsString()
  @IsOptional()
  lastAccessedActivity?: string;
}