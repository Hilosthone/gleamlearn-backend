// src/ai-tutor/dto/ai-tutor.dto.ts
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSessionDto {
  @IsOptional()
  @IsString()
  title?: string;
}

export class TutorMessageDto {
  @IsNotEmpty()
  @IsString()
  message: string;
}

export class TutorActionDto {
  @IsNotEmpty()
  @IsString()
  input: string;

  @IsOptional()
  context?: any;
}