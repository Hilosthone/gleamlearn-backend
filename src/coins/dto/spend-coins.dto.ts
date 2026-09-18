// src/coins/dto/spend-coins.dto.ts
import { IsNotEmpty, IsNumber, IsString, Min, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SpendCoinsDto {
  @ApiProperty({ description: 'Number of coins to spend', example: 100 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ description: 'The item or action being purchased', example: 'STORE_ITEM_PURCHASE' })
  @IsNotEmpty()
  @IsString()
  source: string;

  @ApiPropertyOptional({ description: 'Detailed description of the transaction' })
  @IsOptional()
  @IsString()
  description?: string;
}