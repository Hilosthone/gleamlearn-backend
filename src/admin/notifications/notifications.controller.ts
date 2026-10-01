import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
// import { NotificationsService } from './notifications.service.js';
import { NotificationsService } from './notifications.service.js';
import { CreateNotificationDto } from './dto/create-notification.dto.js';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto.js';
import { NotificationQueryDto } from './dto/notification-query.dto.js';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt.guard.js';

@ApiTags('Admin Notifications')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('api/v1/admin/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @ApiOperation({ summary: 'Send a notification to a specific user' })
  @ApiResponse({ status: 201, description: 'Notification sent successfully.' })
  sendNotification(@Body() dto: CreateNotificationDto, @Req() req: any) {
    return this.notificationsService.sendNotification(dto, req.user.id);
  }

  @Post('broadcast')
  @ApiOperation({ summary: 'Broadcast a notification to specific audience segments (Everyone, Secondary, University, Premium, etc.)' })
  @ApiResponse({ status: 201, description: 'Broadcast sent successfully.' })
  broadcastNotification(@Body() dto: BroadcastNotificationDto, @Req() req: any) {
    return this.notificationsService.broadcastNotification(dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all notifications sent by admins' })
  @ApiResponse({ status: 200, description: 'Notifications history retrieved successfully.' })
  findAll(@Query() query: NotificationQueryDto) {
    return this.notificationsService.findAll(query);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete or revoke a sent notification log by ID' })
  @ApiResponse({ status: 200, description: 'Notification deleted successfully.' })
  remove(@Param('id') id: string) {
    return this.notificationsService.remove(id);
  }
}