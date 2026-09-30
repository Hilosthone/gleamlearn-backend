// src/admin/auth/dto/admin-auth.dto.ts
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminLoginDto {
  @ApiProperty({ example: 'admin.email@gmail.com', description: 'Admin email address' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({ example: 'adminpassword', description: 'Admin password' })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}

export class AdminForgotPasswordDto {
  @ApiProperty({ example: 'admin.email@gmail.com', description: 'Admin email address' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;
}

export class AdminResetPasswordDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsIn...', description: 'Password reset JWT token' })
  @IsString()
  @IsNotEmpty({ message: 'Reset token is required' })
  token: string;

  @ApiProperty({ example: 'NewSecurePassword123!', description: 'New admin password' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  newPassword: string;

  @ApiProperty({ example: 'NewSecurePassword123!', description: 'Confirmation of new password' })
  @IsString()
  @IsNotEmpty({ message: 'Password confirmation is required' })
  confirmNewPassword: string;
}

export class AdminRefreshTokenDto {
  @ApiProperty({ example: 'refresh_token_string_here', description: 'Valid refresh token' })
  @IsString()
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken: string;
}