// src/notifications/notifications.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity.js';
import { NotificationSettings } from './entities/notification-settings.entity.js';
import { UpdateNotificationSettingsDto } from './dto/notification.dto.js';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(NotificationSettings)
    private readonly settingsRepo: Repository<NotificationSettings>,
  ) {}

  async getNotifications(userId: string) {
    const notifications = await this.notificationRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return { status: 'success', data: notifications };
  }

  async getUnreadNotifications(userId: string) {
    const notifications = await this.notificationRepo.find({
      where: { userId, isRead: false },
      order: { createdAt: 'DESC' },
    });
    return { status: 'success', data: notifications };
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.notificationRepo.findOne({ where: { id, userId } });
    if (!notification) {
      throw new HttpException('Notification not found', HttpStatus.NOT_FOUND);
    }
    notification.isRead = true;
    await this.notificationRepo.save(notification);
    return { status: 'success', message: 'Notification marked as read', data: notification };
  }

  async markAllAsRead(userId: string) {
    await this.notificationRepo.update({ userId, isRead: false }, { isRead: true });
    return { status: 'success', message: 'All notifications marked as read' };
  }

  async deleteNotification(id: string, userId: string) {
    const notification = await this.notificationRepo.findOne({ where: { id, userId } });
    if (!notification) {
      throw new HttpException('Notification not found', HttpStatus.NOT_FOUND);
    }
    await this.notificationRepo.remove(notification);
    return { status: 'success', message: 'Notification deleted successfully' };
  }

  // --- Notification Settings ---

  async getSettings(userId: string) {
    let settings = await this.settingsRepo.findOne({ where: { userId } });
    if (!settings) {
      settings = this.settingsRepo.create({ userId });
      await this.settingsRepo.save(settings);
    }
    return { status: 'success', data: settings };
  }

  async updateSettings(userId: string, dto: UpdateNotificationSettingsDto) {
    let settings = await this.settingsRepo.findOne({ where: { userId } });
    if (!settings) {
      settings = this.settingsRepo.create({ userId, ...dto });
    } else {
      Object.assign(settings, dto);
    }
    await this.settingsRepo.save(settings);
    return { status: 'success', message: 'Notification settings updated successfully', data: settings };
  }
}