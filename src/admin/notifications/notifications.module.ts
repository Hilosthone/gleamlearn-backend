import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import { AdminNotification } from './entities/admin-notification.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([AdminNotification])],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class AdminNotificationsModule {}