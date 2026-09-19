// src/personal-ai-companion/dto/ai-companion.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class UpsertAiCompanionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  personality?: string;

  @IsOptional()
  @IsString()
  voice?: string;

  @IsOptional()
  @IsString()
  appearance?: string;

  @IsOptional()
  @IsString()
  outfit?: string;

  @IsOptional()
  @IsString()
  teachingStyle?: string;
}