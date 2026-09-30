// src/admin/questions/dto/create-admin-question.dto.ts
import { IsNotEmpty, IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAdminQuestionDto {
  @ApiProperty({ example: 'What is Dependency Injection in NestJS?', description: 'The question text' })
  @IsNotEmpty()
  @IsString()
  questionText: string;

  @ApiProperty({ example: ['A design pattern', 'A database', 'An HTTP method'], description: 'List of choices' })
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  options: string[];

  @ApiProperty({ example: 'A design pattern', description: 'The correct answer' })
  @IsNotEmpty()
  @IsString()
  correctAnswer: string;

  @ApiPropertyOptional({ example: 'DI allows classes to receive dependencies from external sources.', description: 'Explanation' })
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiProperty({ example: 'Software Engineering', description: 'Subject or category name' })
  @IsNotEmpty()
  @IsString()
  subjectOrCategory: string;
}