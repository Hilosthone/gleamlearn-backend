// // src/quizzes/dto/create-quiz.dto.ts
// import { IsString, IsOptional, IsArray, IsObject } from 'class-validator';

// export class CreateQuizDto {
//   @IsString()
//   @IsOptional()
//   title?: string;

//   @IsString()
//   @IsOptional()
//   description?: string;

//   @IsString()
//   @IsOptional()
//   courseId?: string;

//   @IsString()
//   @IsOptional()
//   topic?: string;

//   @IsArray()
//   @IsOptional()
//   questions?: any[];

//   @IsObject()
//   @IsOptional()
//   options?: Record<string, any>;
// }

// src/quizzes/dto/create-quiz.dto.ts
import { IsString, IsOptional, IsArray, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateQuizDto {
  @ApiPropertyOptional({ 
    description: 'Title of the quiz', 
    example: 'Advanced TypeScript & NestJS Architecture' 
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ 
    description: 'Brief description or overview of the quiz content', 
    example: 'Test your understanding of modules, custom decorators, and service injection.' 
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Associated course UUID if linked to a specific curriculum', 
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' 
  })
  @IsString()
  @IsOptional()
  courseId?: string;

  @ApiPropertyOptional({ 
    description: 'Specific topic or module category', 
    example: 'Backend Engineering' 
  })
  @IsString()
  @IsOptional()
  topic?: string;

  @ApiPropertyOptional({ 
    description: 'Array of question objects containing prompts, options, and correct answers', 
    example: [{ question: 'What does DI stand for?', choices: ['Dependency Injection', 'Data Index'], answer: 'Dependency Injection' }] 
  })
  @IsArray()
  @IsOptional()
  questions?: any[];

  @ApiPropertyOptional({ 
    description: 'Additional configuration options or metadata settings for the quiz', 
    example: { timeLimitMinutes: 15, passingScore: 70 } 
  })
  @IsObject()
  @IsOptional()
  options?: Record<string, any>;
}