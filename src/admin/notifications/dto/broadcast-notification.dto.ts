import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BroadcastNotificationDto {
  @ApiProperty({ example: 'Platform Maintenance Notice', description: 'Broadcast title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'The system will undergo scheduled maintenance tonight at 12 AM.', description: 'Broadcast message' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    example: 'UNIVERSITY_STUDENTS',
    enum: ['EVERYONE', 'SECONDARY_STUDENTS', 'UNIVERSITY_STUDENTS', 'SPECIFIC_INSTITUTION', 'SPECIFIC_DEPARTMENT', 'PREMIUM_USERS'],
    description: 'Target audience segment for the broadcast',
  })
  @IsString()
  @IsIn([
    'EVERYONE',
    'SECONDARY_STUDENTS',
    'UNIVERSITY_STUDENTS',
    'SPECIFIC_INSTITUTION',
    'SPECIFIC_DEPARTMENT',
    'PREMIUM_USERS',
  ])
  target: string;

  @ApiPropertyOptional({ example: 'oau-med-rehab-2025', description: 'Required only if target is SPECIFIC_INSTITUTION or SPECIFIC_DEPARTMENT' })
  @IsOptional()
  @IsString()
  targetId?: string;
}