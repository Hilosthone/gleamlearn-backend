// src/auth/dto/signup.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Limits match the users table (fullName 150, username 100, email 255, country 100) so over-long input is a
 * 400 with a field message instead of a database error (500). Free-text fields are capped generously above
 * what the registration wizard allows (text 200; the exam path composes exams, timeframe, subjects and goals
 * into examAimOrGoals, up to about 1,300 characters).
 */
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const TEXT_MAX = 255;

export class SignupDto {
  @ApiProperty({ example: 'Hilosthone Sulyman', description: 'Full name of the user' })
  @Transform(trim)
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  fullName: string;

  @ApiProperty({ example: 'hilosthone_dev', description: 'Unique username' })
  @Transform(trim)
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  username: string;

  @ApiProperty({ example: 'hilosthone@example.com', description: 'Unique email address' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 'SecurePassword123!', description: 'Password (min 6 characters)', minLength: 6 })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  @MaxLength(128) // bcrypt only uses the first 72 bytes; 128 leaves room for multi-byte characters
  password: string;

  @ApiProperty({ example: 'SecurePassword123!', description: 'Confirmation password matching password' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(128)
  confirmPassword: string;

  @ApiProperty({ example: '2005-05-15', description: 'Date of birth', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateOfBirth must be a date in the form YYYY-MM-DD' })
  dateOfBirth?: string;

  @ApiProperty({ example: 'Nigeria', description: 'Country of residence', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
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
  @MaxLength(TEXT_MAX)
  educationType?: string; // 'Secondary' | 'University'

  // --- Secondary School Track Fields ---
  @ApiProperty({ example: 'Government Secondary School', description: 'Name of secondary school', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(TEXT_MAX)
  secondarySchool?: string;

  @ApiProperty({ example: 'SSS 2', description: 'Class level (JSS 1 - JSS 3 or SSS 1 - SSS 3)', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(TEXT_MAX)
  secondaryClass?: string;

  @ApiProperty({ example: 'Science', description: 'Stream or academic focus (Science, Art, Commercial)', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(TEXT_MAX)
  secondaryStream?: string;

  // --- University / Tertiary Track Fields ---
  @ApiProperty({ example: 'Obafemi Awolowo University', description: 'Name of university', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(TEXT_MAX)
  university?: string;

  @ApiProperty({ example: 'Faculty of Technology', description: 'University faculty', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(TEXT_MAX)
  faculty?: string;

  @ApiProperty({ example: 'Computer Science and Engineering', description: 'Department name', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(TEXT_MAX)
  department?: string;

  @ApiProperty({ example: 'Computer Engineering', description: 'Course or degree program', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(TEXT_MAX)
  courseOfStudy?: string;

  @ApiProperty({ example: '300 Level', description: 'Academic level (100 Level - 600 Level)', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(TEXT_MAX)
  level?: string;

  // --- Goals / Examination Target ---
  @ApiProperty({ 
    example: 'JAMB / WAEC Distinction', 
    description: 'Target exams or academic objectives (e.g., WAEC, GCE, JAMB, POSTUTME, JUPEB, or University Semester Exams/Tests)', 
    required: false 
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  examAimOrGoals?: string;

  @ApiProperty({ example: 'Evening (7 PM - 10 PM)', description: 'Preferred study schedule', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(TEXT_MAX)
  preferredStudyTime?: string;
}