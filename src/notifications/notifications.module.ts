// // src/notifications/notifications.module.ts
// import { Module } from '@nestjs/common';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { Notification } from './entities/notification.entity.js';
// import { NotificationSettings } from './entities/notification-settings.entity.js';
// import { NotificationsService } from './notifications.service.js';
// import { NotificationsController } from './notifications.controller.js';
// import { PushToken } from './entities/push-token.entity.js';

// @Module({
//   imports: [TypeOrmModule.forFeature([Notification, NotificationSettings])],
//   controllers: [NotificationsController],
//   providers: [NotificationsService],
//   exports: [NotificationsService],
// })
// export class NotificationsModule {}



// src/notifications/notifications.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity.js';
import { NotificationSettings } from './entities/notification-settings.entity.js';
import { PushToken } from './entities/push-token.entity.js';
import { NotificationsService } from './notifications.service.js';
import { NotificationsController } from './notifications.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification, 
      NotificationSettings, 
      PushToken // <-- Added here so NestJS creates the repository
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}