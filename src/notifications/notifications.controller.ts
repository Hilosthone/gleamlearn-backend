// // src/notifications/notifications.controller.ts
// import { Controller, Get, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
// import { NotificationsService } from './notifications.service.js';
// import { UpdateNotificationSettingsDto } from './dto/notification.dto.js';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
// import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

// @ApiTags('Notifications')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard) // Secures all notification endpoints with strict JWT verification
// @Controller('api/v1/notifications')
// export class NotificationsController {
//   constructor(private readonly notificationsService: NotificationsService) {}

//   @Get()
//   @ApiOperation({ summary: 'Get all notifications for the authenticated user' })
//   getNotifications(@CurrentUser() user: any) {
//     return this.notificationsService.getNotifications(user.id);
//   }

//   @Get('unread')
//   @ApiOperation({ summary: 'Get unread notifications count/list' })
//   getUnreadNotifications(@CurrentUser() user: any) {
//     return this.notificationsService.getUnreadNotifications(user.id);
//   }

//   @Patch(':id/read')
//   @ApiOperation({ summary: 'Mark a specific notification as read' })
//   markAsRead(@Param('id') id: string, @CurrentUser() user: any) {
//     return this.notificationsService.markAsRead(id, user.id);
//   }

//   @Patch('read-all')
//   @ApiOperation({ summary: 'Mark all notifications as read for user' })
//   markAllAsRead(@CurrentUser() user: any) {
//     return this.notificationsService.markAllAsRead(user.id);
//   }

//   @Delete(':id')
//   @ApiOperation({ summary: 'Delete a specific notification item' })
//   deleteNotification(@Param('id') id: string, @CurrentUser() user: any) {
//     return this.notificationsService.deleteNotification(id, user.id);
//   }

//   // --- Notification Settings Endpoints ---

//   @Get('settings')
//   @ApiOperation({ summary: 'Retrieve user notification preferences and settings' })
//   getSettings(@CurrentUser() user: any) {
//     return this.notificationsService.getSettings(user.id);
//   }

//   @Patch('settings')
//   @ApiOperation({ summary: 'Update user notification preferences and toggles' })
//   updateSettings(@CurrentUser() user: any, @Body() dto: UpdateNotificationSettingsDto) {
//     return this.notificationsService.updateSettings(user.id, dto);
//   }
// }



// src/notifications/notifications.controller.ts
import { Controller, Get, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
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

  @Throttle({ short: { limit: 2, ttl: 2000 }, long: { limit: 20, ttl: 60000 } })
  @Get()
  @ApiOperation({ summary: 'Get all notifications for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Notifications retrieved successfully.' })
  getNotifications(@CurrentUser() user: any) {
    return this.notificationsService.getNotifications(user.id);
  }

  @Throttle({ short: { limit: 2, ttl: 2000 }, long: { limit: 20, ttl: 60000 } })
  @Get('unread')
  @ApiOperation({ summary: 'Get unread notifications count/list' })
  @ApiResponse({ status: 200, description: 'Unread notifications retrieved successfully.' })
  getUnreadNotifications(@CurrentUser() user: any) {
    return this.notificationsService.getUnreadNotifications(user.id);
  }

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 30, ttl: 60000 } })
  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a specific notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read successfully.' })
  markAsRead(@Param('id') id: string, @CurrentUser() user: any) {
    return this.notificationsService.markAsRead(id, user.id);
  }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 10, ttl: 60000 } })
  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read for user' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read successfully.' })
  markAllAsRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 20, ttl: 60000 } })
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a specific notification item' })
  @ApiResponse({ status: 200, description: 'Notification deleted successfully.' })
  deleteNotification(@Param('id') id: string, @CurrentUser() user: any) {
    return this.notificationsService.deleteNotification(id, user.id);
  }

  // --- Notification Settings Endpoints ---

  @Throttle({ short: { limit: 2, ttl: 2000 }, long: { limit: 20, ttl: 60000 } })
  @Get('settings')
  @ApiOperation({ summary: 'Retrieve user notification preferences and settings' })
  @ApiResponse({ status: 200, description: 'Notification settings retrieved successfully.' })
  getSettings(@CurrentUser() user: any) {
    return this.notificationsService.getSettings(user.id);
  }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 15, ttl: 60000 } })
  @Patch('settings')
  @ApiOperation({ summary: 'Update user notification preferences and toggles' })
  @ApiResponse({ status: 200, description: 'Notification settings updated successfully.' })
  updateSettings(@CurrentUser() user: any, @Body() dto: UpdateNotificationSettingsDto) {
    return this.notificationsService.updateSettings(user.id, dto);
  }
}