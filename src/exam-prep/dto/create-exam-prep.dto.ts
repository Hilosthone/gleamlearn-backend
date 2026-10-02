// // src/exam-prep/dto/create-exam-prep.dto.ts
// import { IsString, IsOptional, IsDateString, IsObject } from 'class-validator';

// export class CreateExamPrepDto {
//   @IsString()
//   userId: string;

//   @IsString()
//   examinationId: string;

//   @IsString()
//   targetSubject: string;

//   @IsDateString()
//   @IsOptional()
//   targetExamDate?: string;

//   @IsObject()
//   @IsOptional()
//   studyPlan?: any;
// }


// src/exam-prep/dto/create-exam-prep.dto.ts
import { IsString, IsNotEmpty, IsArray, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateExamPrepDto {
  @ApiProperty({ example: 'JAMB UTME 2026' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'jamb' })
  @IsString()
  @IsNotEmpty()
  examType: string;

  @ApiProperty({ example: ['mathematics', 'english', 'physics', 'chemistry'] })
  @IsArray()
  @IsNotEmpty()
  subjects: string[];

  @ApiProperty({ example: '2026-06-19T00:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  targetDate: string;

  @ApiProperty({ example: 'Focus on high-yield past questions and weekly mock tests', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}