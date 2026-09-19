// src/personal-ai/dto/personal-ai.dto.ts
import { IsNotEmpty, IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatMessageDto {
  @ApiProperty({ description: 'The prompt or message sent to the AI assistant', example: 'Can you explain quantum computing simply?' })
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Optional ongoing conversation session ID', example: 'conv_uuid_123' })
  @IsOptional()
  @IsString()
  conversationId?: string;
}

export class ContextualAiDto {
  @ApiProperty({ description: 'The text snippet, question, or concept to process', example: 'Photosynthesis' })
  @IsNotEmpty()
  @IsString()
  input: string;

  @ApiPropertyOptional({ description: 'Additional contextual metadata', example: { subject: 'Biology' } })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

export class EvaluateAnswerDto {
  @ApiProperty({ description: 'The original question or prompt' })
  @IsNotEmpty()
  @IsString()
  question: string;

  @ApiProperty({ description: 'The user submitted answer' })
  @IsNotEmpty()
  @IsString()
  userAnswer: string;

  @ApiPropertyOptional({ description: 'The correct model answer or grading rubric' })
  @IsOptional()
  @IsString()
  correctAnswer?: string;
}