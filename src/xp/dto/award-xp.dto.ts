// src/xp/dto/award-xp.dto.ts
import { IsNotEmpty, IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class AwardXpDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  amount: number; // Must be at least 1 XP

  @IsNotEmpty()
  @IsString()
  source: string; // e.g., 'MANUAL_GRANT', 'ADMIN_BONUS'

  @IsOptional()
  @IsString()
  description?: string;
}