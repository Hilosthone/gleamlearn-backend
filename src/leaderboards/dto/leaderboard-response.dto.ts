// src/leaderboards/dto/leaderboard-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LeaderboardEntryDto {
  @ApiProperty({ description: 'The user competitive rank position', example: 1 })
  rank: number;

  @ApiProperty({ description: 'Unique user identifier', example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  userId: string;

  @ApiProperty({ description: 'Full name or display name of the scholar', example: 'Hilosthone Sulyman' })
  name: string;

  @ApiProperty({ description: 'Total accumulated XP points', example: 4850 })
  totalXp: number;
}

export class LeaderboardResponseDto {
  @ApiProperty({ description: 'Response status', example: 'success' })
  status: string;

  @ApiProperty({ description: 'Leaderboard scope tier', example: 'global' })
  scope: string;

  @ApiPropertyOptional({ description: 'Specific filter target if applicable', example: 'Nigeria' })
  filterValue?: string;

  @ApiProperty({ description: 'Ordered list of leaderboard ranked scholars', type: [LeaderboardEntryDto] })
  leaderboard: LeaderboardEntryDto[];
}

export class MyRankResponseDto {
  @ApiProperty({ description: 'Response status', example: 'success' })
  status: string;

  @ApiProperty({ description: 'Authenticated user identifier' })
  userId: string;

  @ApiProperty({ description: 'Current overall rank position', example: 12 })
  rank: number | null;

  @ApiProperty({ description: 'Total user XP', example: 2400 })
  totalXp: number;

  @ApiProperty({ description: 'Status message' })
  message: string;
}