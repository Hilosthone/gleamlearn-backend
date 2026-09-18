// // src/quizzes/dto/submit-quiz.dto.ts
// import { IsObject, IsOptional } from 'class-validator';

// export class SubmitQuizDto {
//   @IsObject()
//   @IsOptional()
//   answers?: Record<string, any>;
// }


// src/quizzes/dto/submit-quiz.dto.ts
import { IsObject, IsOptional, IsNumber, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitQuizDto {
  @ApiPropertyOptional({ 
    description: 'Key-value mapping of question IDs to user answers', 
    example: { "q1": "A", "q2": "True" } 
  })
  @IsObject()
  @IsOptional()
  answers?: Record<string, any>;

  @ApiPropertyOptional({ 
    description: 'Time spent completing the quiz in seconds', 
    example: 120 
  })
  @IsNumber()
  @IsOptional()
  timeSpentSeconds?: number;

  @ApiPropertyOptional({ 
    description: 'The unique attempt session identifier', 
    example: 'attempt_1695000000000' 
  })
  @IsString()
  @IsOptional()
  attemptId?: string;
}