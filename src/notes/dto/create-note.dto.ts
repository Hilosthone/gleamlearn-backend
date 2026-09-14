// src/notes/dto/create-note.dto.ts
import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNoteDto {
  @ApiProperty({ description: 'Title of the study note' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Main content body of the note (Markdown supported)' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Associated course ID if linked to a course' })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Tags for categorization', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}