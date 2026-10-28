// src/reports/dto/create-feedback.dto.ts
import { IsString, IsNotEmpty, IsInt, Min, Max, MaxLength } from 'class-validator';

export class CreateFeedbackDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message: string;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsNotEmpty()
  rating: number;
}