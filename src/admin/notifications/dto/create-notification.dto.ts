import { IsString, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty({ example: '087f0ab8-92eb-4989-b56a-ec344dfab750', description: 'Target User ID' })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: 'Important Update regarding your course', description: 'Notification title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Your scholarship application has been reviewed.', description: 'Notification message body' })
  @IsString()
  @IsNotEmpty()
  message: string;
}