import { BadRequestException } from '@nestjs/common';
import { featureUnavailable } from '../../common/errors/feature-unavailable.js';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminNotification } from './entities/admin-notification.entity.js';
import { CreateNotificationDto } from './dto/create-notification.dto.js';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto.js';
import { NotificationQueryDto } from './dto/notification-query.dto.js';

/** Learners who still have an account (deleted and frozen accounts get nothing). */
const ACTIVE = `u."deletedAt" IS NULL AND COALESCE(u."isFrozen", false) = false`;
const AUDIENCE_SQL: Record<string, { where: string; needsTarget?: boolean }> = {
  EVERYONE: { where: ACTIVE },
  SECONDARY_STUDENTS: { where: `${ACTIVE} AND u."educationType" = 'Secondary'` },
  UNIVERSITY_STUDENTS: { where: `${ACTIVE} AND u."educationType" = 'University'` },
  SPECIFIC_INSTITUTION: { where: `${ACTIVE} AND (LOWER(TRIM(u."university")) = LOWER(TRIM($3)) OR LOWER(TRIM(u."secondarySchool")) = LOWER(TRIM($3)))`, needsTarget: true },
  SPECIFIC_DEPARTMENT: { where: `${ACTIVE} AND LOWER(TRIM(u."department")) = LOWER(TRIM($3))`, needsTarget: true },
};

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(AdminNotification)
    private readonly notificationRepo: Repository<AdminNotification>,
  ) {}

  async sendNotification(dto: CreateNotificationDto, adminId: string) {
    // Delivered to the learner's notifications (it used to be stored only in the admin history and never reached them)
    const delivered = (await this.notificationRepo.manager.query(
      `INSERT INTO "notifications" ("userId", "title", "message", "type")
       SELECT u.id::text, $2, $3, 'system' FROM "users" u WHERE u.id = $1 AND ${ACTIVE} RETURNING id`,
      [dto.userId, dto.title, dto.message],
    )) as unknown[];
    if (!delivered.length) throw new NotFoundException('No active learner with that id.');
    const saved = await this.notificationRepo.save(
      this.notificationRepo.create({ title: dto.title, message: dto.message, targetType: 'SINGLE_USER', targetId: dto.userId, senderAdminId: adminId }),
    );
    return { status: 'success', message: 'Delivered to the learner.', data: { ...saved, deliveredCount: delivered.length } };
  }

  async broadcastNotification(dto: BroadcastNotificationDto, adminId: string) {
    const audience = AUDIENCE_SQL[dto.target];
    if (!audience) throw featureUnavailable('Broadcast to premium users', 'there are no live subscriptions, so premium learners cannot be identified');
    const target = (dto.targetId ?? '').trim();
    if (audience.needsTarget && !target) throw new BadRequestException('Name the institution or department.');
    const params = audience.needsTarget ? [dto.title, dto.message, target] : [dto.title, dto.message];
    // one statement: every learner in the audience gets the notification, or none do
    const delivered = (await this.notificationRepo.manager.query(
      `INSERT INTO "notifications" ("userId", "title", "message", "type")
       SELECT u.id::text, $1, $2, 'system' FROM "users" u WHERE ${audience.where} RETURNING id`,
      params,
    )) as unknown[];
    const saved = await this.notificationRepo.save(
      this.notificationRepo.create({ title: dto.title, message: dto.message, targetType: dto.target, targetId: target || null, senderAdminId: adminId }),
    );
    return { status: 'success', message: `Delivered to ${delivered.length} learner(s).`, data: { ...saved, deliveredCount: delivered.length } };
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