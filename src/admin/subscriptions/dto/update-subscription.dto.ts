import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({ example: 'Pro Annual', description: 'Subscription plan name' })
  @IsOptional()
  @IsString()
  plan?: string;

  @ApiPropertyOptional({ example: 'ACTIVE', enum: ['ACTIVE', 'CANCELLED', 'EXPIRED', 'PENDING'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'CANCELLED', 'EXPIRED', 'PENDING'])
  status?: string;

  @ApiPropertyOptional({ example: '2027-09-30T00:00:00.000Z' })
  @IsOptional()
  expiresAt?: Date;
}