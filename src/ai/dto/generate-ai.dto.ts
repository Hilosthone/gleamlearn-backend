// src/ai/dto/generate-ai.dto.ts
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum OutputTone {
  ACADEMIC = 'ACADEMIC',
  CASUAL = 'CASUAL',
  CONCISE = 'CONCISE',
  DETAILED = 'DETAILED',
}

export class GenerateAiDto {
  @ApiPropertyOptional({ description: 'Custom prompt override or extra instruction for the AI' })
  @IsOptional()
  @IsString()
  customPrompt?: string;

  @ApiPropertyOptional({ enum: OutputTone, description: 'Desired tone of the generated academic content' })
  @IsOptional()
  @IsEnum(OutputTone)
  tone?: OutputTone;

  @ApiPropertyOptional({ description: 'Target language code (e.g. en, fr, ar)', default: 'en' })
  @IsOptional()
  @IsString()
  language?: string;
}