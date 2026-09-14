// src/questions/dto/question.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateQuestionDto {
  @ApiProperty({ example: 'course-uuid-123', required: false })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiProperty({ example: 'Mathematics', required: false })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ example: 'Calculus - Integration', required: false })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiProperty({ example: 'hard', enum: ['easy', 'medium', 'hard'], required: false })
  @IsOptional()
  @IsString()
  difficulty?: string;

  @ApiProperty({ example: 'objective', enum: ['objective', 'theory', 'true_false'], required: false })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ example: 'WAEC', required: false })
  @IsOptional()
  @IsString()
  examination?: string;

  @ApiProperty({ example: 2024, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  year?: number;

  @ApiProperty({ example: 'Past Questions 2024', required: false })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({ example: 'What is the integral of 2x?' })
  @IsString()
  questionText: string;

  @ApiProperty({ example: ['x^2 + C', '2x^2', 'x', '2'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiProperty({ example: 'x^2 + C' })
  @IsString()
  correctAnswer: string;

  @ApiProperty({ example: 'Integration rule: int(nx^n-1) = x^n + C', required: false })
  @IsOptional()
  @IsString()
  explanation?: string;
}

export class UpdateQuestionDto extends CreateQuestionDto {}

export class QueryQuestionsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  difficulty?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  examination?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  year?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  source?: string;
}