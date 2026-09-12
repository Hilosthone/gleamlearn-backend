// src/files/dto/create-file.dto.ts
import { IsString, IsOptional, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFileDto {
  @ApiProperty({ description: 'The custom title or description of the file' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Optional tags for categorization' })
  @IsOptional()
  @IsString()
  category?: string;
}