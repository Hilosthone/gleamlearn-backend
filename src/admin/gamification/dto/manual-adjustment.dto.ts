import { IsNumber, IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ManualAdjustmentDto {
  @ApiProperty({ example: 100, description: 'Amount of XP or coins to add (positive) or deduct (negative)' })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ example: 'Customer support compensation for bug loss', description: 'Mandatory reason for auditing' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5, { message: 'A detailed reason of at least 5 characters is required for audit compliance.' })
  reason: string;
}