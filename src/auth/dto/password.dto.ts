import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'abc123xyz-reset-token' })
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'NewSecurePassword123!', minLength: 6 })
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPassword123!' })
  @IsNotEmpty()
  oldPassword: string;

  @ApiProperty({ example: 'NewSecurePassword123!', minLength: 6 })
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;
}

export class UpdateUserDto {
  @ApiProperty({ example: 'Hilosthone Sulyman', required: false })
  name?: string;

  @ApiProperty({ example: 'hilosthone@example.com', required: false })
  email?: string;
}