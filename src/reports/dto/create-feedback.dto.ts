// src/reports/dto/create-feedback.dto.ts
import { IsString, IsNotEmpty, IsInt, Min, Max } from 'class-validator';

export class CreateFeedbackDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsNotEmpty()
  rating: number;
}