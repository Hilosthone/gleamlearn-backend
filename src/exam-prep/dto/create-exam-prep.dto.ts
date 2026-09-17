// src/exam-prep/dto/create-exam-prep.dto.ts
import { IsString, IsOptional, IsDateString, IsObject } from 'class-validator';

export class CreateExamPrepDto {
  @IsString()
  userId: string;

  @IsString()
  examinationId: string;

  @IsString()
  targetSubject: string;

  @IsDateString()
  @IsOptional()
  targetExamDate?: string;

  @IsObject()
  @IsOptional()
  studyPlan?: any;
}