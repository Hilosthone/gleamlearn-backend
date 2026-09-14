// src/flashcards/dto/deck.dto.ts
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateDeckDto {
  @ApiProperty({ example: 'Advanced Mathematics' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Calculus and differential equations' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Mathematics' })
  @IsOptional()
  @IsString()
  category?: string;
}

export class UpdateDeckDto extends PartialType(CreateDeckDto) {}