// src/tests/dto/create-test.dto.ts
import { IsString, IsOptional, IsArray, IsNumber } from 'class-validator';

export class CreateTestDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  courseId?: string;

  @IsArray()
  @IsOptional()
  questions?: any[];

  @IsNumber()
  @IsOptional()
  durationMinutes?: number;
}