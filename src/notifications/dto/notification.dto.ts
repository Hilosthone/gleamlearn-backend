// src/notifications/dto/notification.dto.ts
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationSettingsDto {
  @IsOptional()
  @IsBoolean()
  emailAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  aiTutorReminders?: boolean;

  @IsOptional()
  @IsBoolean()
  marketingEmails?: boolean;
}