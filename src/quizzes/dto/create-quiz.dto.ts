// src/quizzes/dto/create-quiz.dto.ts
import { IsString, IsOptional, IsArray, IsObject } from 'class-validator';

export class CreateQuizDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  courseId?: string;

  @IsString()
  @IsOptional()
  topic?: string;

  @IsArray()
  @IsOptional()
  questions?: any[];

  @IsObject()
  @IsOptional()
  options?: Record<string, any>;
}