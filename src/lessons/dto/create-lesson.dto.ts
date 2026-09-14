// src/lessons/dto/create-lesson.dto.ts
import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLessonDto {
  @ApiProperty({ description: 'Title of the lesson' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Main content or transcript of the lesson' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Sorting order index within the course module', default: 0 })
  @IsOptional()
  @IsNumber()
  orderIndex?: number;
}