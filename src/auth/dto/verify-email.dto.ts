import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ example: 'abc123xyz-verification-token' })
  @IsNotEmpty()
  @IsString()
  token: string;
}