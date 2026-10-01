import { IsBoolean, IsInt, IsObject, IsOptional, IsArray, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSystemSettingsDto {
  @ApiPropertyOptional({ example: { hardQuiz: 50, easyQuiz: 15 } })
  @IsOptional()
  @IsObject()
  xpRewards?: Record<string, number>;

  @ApiPropertyOptional({ example: { hardQuiz: 20, dailyLogin: 5 } })
  @IsOptional()
  @IsObject()
  coinRewards?: Record<string, number>;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  streakRecoveryLimit?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  freeAiLimit?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  premiumAiLimit?: number;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUploadSizeMb?: number;

  @ApiPropertyOptional({ example: ['pdf', 'docx', 'png'] })
  @IsOptional()
  @IsArray()
  supportedFileTypes?: string[];

  @ApiPropertyOptional({ example: { emailEnabled: true, pushEnabled: true } })
  @IsOptional()
  @IsObject()
  notificationSettings?: Record<string, boolean>;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  maintenanceMode?: boolean;
}