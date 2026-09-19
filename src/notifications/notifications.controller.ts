// src/notifications/notifications.controller.ts
import { Controller, Get, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service.js';
import { UpdateNotificationSettingsDto } from './dto/notification.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard) // Secures all notification endpoints with strict JWT verification
@Controller('api/v1/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications for the authenticated user' })
  getNotifications(@CurrentUser() user: any) {
    return this.notificationsService.getNotifications(user.id);
  }

  @Get('unread')
  @ApiOperation({ summary: 'Get unread notifications count/list' })
  getUnreadNotifications(@CurrentUser() user: any) {
    return this.notificationsService.getUnreadNotifications(user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a specific notification as read' })
  markAsRead(@Param('id') id: string, @CurrentUser() user: any) {
    return this.notificationsService.markAsRead(id, user.id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read for user' })
  markAllAsRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a specific notification item' })
  deleteNotification(@Param('id') id: string, @CurrentUser() user: any) {
    return this.notificationsService.deleteNotification(id, user.id);
  }

  // --- Notification Settings Endpoints ---

  @Get('settings')
  @ApiOperation({ summary: 'Retrieve user notification preferences and settings' })
  getSettings(@CurrentUser() user: any) {
    return this.notificationsService.getSettings(user.id);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update user notification preferences and toggles' })
  updateSettings(@CurrentUser() user: any, @Body() dto: UpdateNotificationSettingsDto) {
    return this.notificationsService.updateSettings(user.id, dto);
  }
}