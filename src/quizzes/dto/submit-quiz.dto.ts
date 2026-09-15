// src/quizzes/dto/submit-quiz.dto.ts
import { IsObject, IsOptional } from 'class-validator';

export class SubmitQuizDto {
  @IsObject()
  @IsOptional()
  answers?: Record<string, any>;
}