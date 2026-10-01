import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RestrictUserDto {
  @ApiProperty({ example: 'Flagged for automated scraping and abuse of AI generation endpoints.', description: 'Reason for restriction' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}