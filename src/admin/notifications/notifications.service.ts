import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminNotification } from './entities/admin-notification.entity.js';
import { CreateNotificationDto } from './dto/create-notification.dto.js';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto.js';
import { NotificationQueryDto } from './dto/notification-query.dto.js';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(AdminNotification)
    private readonly notificationRepo: Repository<AdminNotification>,
  ) {}

  async sendNotification(dto: CreateNotificationDto, adminId: string) {
    const notification = this.notificationRepo.create({
      title: dto.title,
      message: dto.message,
      targetType: 'SINGLE_USER',
      targetId: dto.userId,
      senderAdminId: adminId,
    });
    const saved = await this.notificationRepo.save(notification);

    return {
      status: 'success',
      message: 'Notification sent successfully to user',
      data: saved,
    };
  }

  async broadcastNotification(dto: BroadcastNotificationDto, adminId: string) {
    const notification = this.notificationRepo.create({
      title: dto.title,
      message: dto.message,
      targetType: dto.target,
      targetId: dto.targetId || null,
      senderAdminId: adminId,
    });
    const saved = await this.notificationRepo.save(notification);

    // In a production setup, you would trigger push/websocket event dispatchers here based on dto.target

    return {
      status: 'success',
      message: `Broadcast notification successfully targeted to: ${dto.target}`,
      data: saved,
    };
  }

  async findAll(query: NotificationQueryDto) {
    const { page = 1, limit = 10 } = query;
    const [notifications, total] = await this.notificationRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      status: 'success',
      data: {
        notifications,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    };
  }

  async remove(id: string) {
    const notification = await this.notificationRepo.findOne({ where: { id } });
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    await this.notificationRepo.remove(notification);

    return {
      status: 'success',
      message: 'Notification record deleted successfully',
    };
  }
}