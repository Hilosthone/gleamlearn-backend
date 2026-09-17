// src/exams/dto/submit-exam.dto.ts
import { IsObject, IsOptional } from 'class-validator';

export class SubmitExamDto {
  @IsObject()
  @IsOptional()
  answers?: Record<string, any>;
}