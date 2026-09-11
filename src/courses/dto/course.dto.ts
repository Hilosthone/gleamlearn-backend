import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsInt } from 'class-validator';

export class CreateCourseDto {
  @ApiProperty({ example: 'Advanced Mathematics for Senior Secondary' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ example: 'Comprehensive guide covering algebra, calculus, and trigonometry', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Secondary', description: 'Secondary or University' })
  @IsNotEmpty()
  @IsString()
  track: string;

  @ApiProperty({ example: 'SS 3', required: false })
  @IsOptional()
  @IsString()
  level?: string;

  @ApiProperty({ example: 'uuid-of-department', required: false })
  @IsOptional()
  @IsString()
  departmentId?: string;
}

export class UpdateCourseDto extends CreateCourseDto {}

export class CreateTopicDto {
  @ApiProperty({ example: 'Introduction to Matrices' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ example: 'Learn determinants and inverse matrices', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  order?: number;
}

export class UpdateTopicDto extends CreateTopicDto {}