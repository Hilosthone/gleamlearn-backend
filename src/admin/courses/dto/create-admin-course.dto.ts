// src/admin/courses/dto/create-admin-course.dto.ts
import { IsNotEmpty, IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAdminCourseDto {
  @ApiProperty({ example: 'Advanced TypeScript & NestJS Architecture', description: 'Course title' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Comprehensive guide to building production-ready backends.', description: 'Course description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Software Engineering', description: 'Course category' })
  @IsNotEmpty()
  @IsString()
  category: string;

  @ApiPropertyOptional({ example: 49.99, description: 'Course price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}