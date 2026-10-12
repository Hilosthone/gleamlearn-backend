import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ example: 'ada@example.com', description: 'Account the code was sent to (required unless AUTH_CODE_REQUIRES_EMAIL=false)' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'abc123xyz-verification-token' })
  @IsNotEmpty()
  @IsString()
  token: string;
}