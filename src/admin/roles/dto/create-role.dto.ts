import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ example: 'FINANCE_MANAGER', description: 'Unique role title' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Manages transactions, revenue metrics, and subscription overrides' })
  @IsOptional()
  @IsString()
  description?: string;
}