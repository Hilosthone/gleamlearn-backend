// src/reports/dto/create-report.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsEnum, MaxLength } from 'class-validator';

export enum ReportType {
  SPAM = 'SPAM',
  INAPPROPRIATE = 'INAPPROPRIATE',
  COPYRIGHT = 'COPYRIGHT',
  OTHER = 'OTHER',
}

export class CreateReportDto {
  @IsEnum(ReportType)
  @IsNotEmpty()
  type: ReportType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  reason: string;

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  details?: string;
}