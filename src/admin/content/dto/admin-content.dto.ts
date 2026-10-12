// src/admin/content/dto/admin-content.dto.ts
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class AdminContentQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Matches course title (case-insensitive)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}

/** Learner catalog course (table `courses`). */
export class AdminCreateCourseDto {
  @ApiProperty({ example: 'Introduction to Biology' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({ example: 'Secondary', description: "Learning track, e.g. 'Secondary' or 'University'" })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  track: string;

  @ApiPropertyOptional({ example: 'SS 2' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  level?: string;

  @ApiPropertyOptional({ description: 'Existing department id' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;
}

/** Partial update: only provided fields change. */
export class AdminUpdateCourseDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(50) track?: string;
  @IsOptional() @IsString() @MaxLength(50) level?: string;
  @IsOptional() @IsUUID() departmentId?: string;
}

export class AdminCreateTopicDto {
  @IsString() @MinLength(1) @MaxLength(200) title: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) order?: number;
}

export class AdminUpdateTopicDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) order?: number;
}

export class AdminCreateLessonDto {
  @IsString() @MinLength(1) @MaxLength(200) title: string;
  @IsOptional() @IsString() @MaxLength(100_000) content?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) orderIndex?: number;
}

export class AdminUpdateLessonDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(100_000) content?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) orderIndex?: number;
}
