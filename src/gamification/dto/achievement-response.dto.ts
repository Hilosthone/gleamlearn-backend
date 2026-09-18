// src/gamification/dto/achievement-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class AchievementResponseDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id: string;

  @ApiProperty({ example: 'FIRST_QUIZ' })
  slug: string;

  @ApiProperty({ example: 'First Steps' })
  title: string;

  @ApiProperty({ example: 'Complete your very first quiz.' })
  description: string;

  @ApiProperty({ example: 50 })
  rewardXp: number;

  @ApiProperty({ example: 10 })
  rewardCoins: number;
}