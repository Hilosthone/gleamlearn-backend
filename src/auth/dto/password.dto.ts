import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'ada@example.com', description: 'Account the reset code was sent to (required unless AUTH_CODE_REQUIRES_EMAIL=false)' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'abc123xyz-reset-token' })
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'NewSecurePassword123!', minLength: 6 })
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;

  @ApiProperty({ example: 'NewSecurePassword123!', description: 'Must match newPassword' })
  @IsNotEmpty()
  @IsString()
  confirmNewPassword: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPassword123!' })
  @IsNotEmpty()
  oldPassword: string;

  @ApiProperty({ example: 'NewSecurePassword123!', minLength: 6 })
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;

  @ApiProperty({ example: 'NewSecurePassword123!', description: 'Must match newPassword' })
  @IsNotEmpty()
  @IsString()
  confirmNewPassword: string;
}

export class UpdateUserDto {
  @ApiProperty({ example: 'Hilosthone Sulyman', required: false, description: 'Legacy alias for fullName' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'Hilosthone Sulyman', required: false })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({ example: 'hilosthone', required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ example: '2004-05-12', required: false })
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @ApiProperty({ example: 'Nigeria', required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ example: 'hilosthone@example.com', required: false, description: 'Must equal the current email; changing email requires verification' })
  @IsOptional()
  @IsEmail()
  email?: string;
}