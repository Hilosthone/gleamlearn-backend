// src/flashcards/dto/flashcard.dto.ts
import { IsNotEmpty, IsOptional, IsString, IsUUID, Min, Max, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateFlashcardDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsNotEmpty()
  @IsUUID()
  deckId: string;

  @ApiProperty({ example: 'What is the derivative of sin(x)?' })
  @IsNotEmpty()
  @IsString()
  question: string;

  @ApiProperty({ example: 'cos(x)' })
  @IsNotEmpty()
  @IsString()
  answer: string;
}

export class UpdateFlashcardDto extends PartialType(CreateFlashcardDto) {}

export class ReviewFlashcardDto {
  @ApiProperty({ example: 4, description: 'Recall quality grade from 0 to 5' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(5)
  quality: number;
}