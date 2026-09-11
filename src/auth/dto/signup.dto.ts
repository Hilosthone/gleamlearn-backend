// src/auth/dto/signup.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class SignupDto {
  @ApiProperty({ example: 'Hilosthone Sulyman', description: 'Full name of the user' })
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @ApiProperty({ example: 'hilosthone_dev', description: 'Unique username' })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({ example: 'hilosthone@example.com', description: 'Unique email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePassword123!', description: 'Password (min 6 characters)', minLength: 6 })
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'SecurePassword123!', description: 'Confirmation password matching password' })
  @IsNotEmpty()
  confirmPassword: string;

  @ApiProperty({ example: '2005-05-15', description: 'Date of birth', required: false })
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @ApiProperty({ example: 'Nigeria', description: 'Country of residence', required: false })
  @IsOptional()
  @IsString()
  country?: string;

  // --- Core Education Track Switch ---
  @ApiProperty({ 
    example: 'University', 
    description: 'Education track selection: Secondary or University', 
    enum: ['Secondary', 'University'],
    required: false 
  })
  @IsOptional()
  @IsString()
  educationType?: string; // 'Secondary' | 'University'

  // --- Secondary School Track Fields ---
  @ApiProperty({ example: 'Government Secondary School', description: 'Name of secondary school', required: false })
  @IsOptional()
  @IsString()
  secondarySchool?: string;

  @ApiProperty({ example: 'SSS 2', description: 'Class level (JSS 1 - JSS 3 or SSS 1 - SSS 3)', required: false })
  @IsOptional()
  @IsString()
  secondaryClass?: string;

  @ApiProperty({ example: 'Science', description: 'Stream or academic focus (Science, Art, Commercial)', required: false })
  @IsOptional()
  @IsString()
  secondaryStream?: string;

  // --- University / Tertiary Track Fields ---
  @ApiProperty({ example: 'Obafemi Awolowo University', description: 'Name of university', required: false })
  @IsOptional()
  @IsString()
  university?: string;

  @ApiProperty({ example: 'Faculty of Technology', description: 'University faculty', required: false })
  @IsOptional()
  @IsString()
  faculty?: string;

  @ApiProperty({ example: 'Computer Science and Engineering', description: 'Department name', required: false })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ example: 'Computer Engineering', description: 'Course or degree program', required: false })
  @IsOptional()
  @IsString()
  courseOfStudy?: string;

  @ApiProperty({ example: '300 Level', description: 'Academic level (100 Level - 600 Level)', required: false })
  @IsOptional()
  @IsString()
  level?: string;

  // --- Goals / Examination Target ---
  @ApiProperty({ 
    example: 'JAMB / WAEC Distinction', 
    description: 'Target exams or academic objectives (e.g., WAEC, GCE, JAMB, POSTUTME, JUPEB, or University Semester Exams/Tests)', 
    required: false 
  })
  @IsOptional()
  @IsString()
  examAimOrGoals?: string;

  @ApiProperty({ example: 'Evening (7 PM - 10 PM)', description: 'Preferred study schedule', required: false })
  @IsOptional()
  @IsString()
  preferredStudyTime?: string;
}