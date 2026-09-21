// // src/notifications/notifications.service.ts
// import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { Notification } from './entities/notification.entity.js';
// import { NotificationSettings } from './entities/notification-settings.entity.js';
// import { UpdateNotificationSettingsDto } from './dto/notification.dto.js';

// @Injectable()
// export class NotificationsService {
//   constructor(
//     @InjectRepository(Notification)
//     private readonly notificationRepo: Repository<Notification>,
//     @InjectRepository(NotificationSettings)
//     private readonly settingsRepo: Repository<NotificationSettings>,
//   ) {}

//   async getNotifications(userId: string) {
//     const notifications = await this.notificationRepo.find({
//       where: { userId },
//       order: { createdAt: 'DESC' },
//     });
//     return { status: 'success', data: notifications };
//   }

//   async getUnreadNotifications(userId: string) {
//     const notifications = await this.notificationRepo.find({
//       where: { userId, isRead: false },
//       order: { createdAt: 'DESC' },
//     });
//     return { status: 'success', data: notifications };
//   }

//   async markAsRead(id: string, userId: string) {
//     const notification = await this.notificationRepo.findOne({ where: { id, userId } });
//     if (!notification) {
//       throw new HttpException('Notification not found', HttpStatus.NOT_FOUND);
//     }
//     notification.isRead = true;
//     await this.notificationRepo.save(notification);
//     return { status: 'success', message: 'Notification marked as read', data: notification };
//   }

//   async markAllAsRead(userId: string) {
//     await this.notificationRepo.update({ userId, isRead: false }, { isRead: true });
//     return { status: 'success', message: 'All notifications marked as read' };
//   }

//   async deleteNotification(id: string, userId: string) {
//     const notification = await this.notificationRepo.findOne({ where: { id, userId } });
//     if (!notification) {
//       throw new HttpException('Notification not found', HttpStatus.NOT_FOUND);
//     }
//     await this.notificationRepo.remove(notification);
//     return { status: 'success', message: 'Notification deleted successfully' };
//   }

//   // --- Notification Settings ---

//   async getSettings(userId: string) {
//     let settings = await this.settingsRepo.findOne({ where: { userId } });
//     if (!settings) {
//       settings = this.settingsRepo.create({ userId });
//       await this.settingsRepo.save(settings);
//     }
//     return { status: 'success', data: settings };
//   }

//   async updateSettings(userId: string, dto: UpdateNotificationSettingsDto) {
//     let settings = await this.settingsRepo.findOne({ where: { userId } });
//     if (!settings) {
//       settings = this.settingsRepo.create({ userId, ...dto });
//     } else {
//       Object.assign(settings, dto);
//     }
//     await this.settingsRepo.save(settings);
//     return { status: 'success', message: 'Notification settings updated successfully', data: settings };
//   }
// }


// src/notifications/notifications.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { Notification } from './entities/notification.entity.js';
import { NotificationSettings } from './entities/notification-settings.entity.js';
import { PushToken } from './entities/push-token.entity.js';
import { UpdateNotificationSettingsDto } from './dto/notification.dto.js';

@Injectable()
export class NotificationsService {
  private firebaseApp: App;

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(NotificationSettings)
    private readonly settingsRepo: Repository<NotificationSettings>,
    @InjectRepository(PushToken)
    private readonly pushTokenRepo: Repository<PushToken>,
  ) {
    // Initialize Firebase Admin SDK securely using environment variables
    if (!getApps().length) {
      this.firebaseApp = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      this.firebaseApp = getApps()[0];
    }
  }

  // --- Core In-App & Push Trigger Method ---

  async createAndPushNotification(userId: string, title: string, message: string, type: string = 'general') {
    // 1. Save to database for in-app history/inbox
    const notification = this.notificationRepo.create({
      userId,
      title,
      message,
      type,
      isRead: false,
    });
    const savedNotification = await this.notificationRepo.save(notification);

    // 2. Fetch user's push tokens
    const userTokens = await this.pushTokenRepo.find({ where: { userId } });

    // 3. Dispatch external push notifications via Firebase Cloud Messaging (FCM)
    const messaging = getMessaging(this.firebaseApp);
    for (const tokenRecord of userTokens) {
      try {
        await messaging.send({
          token: tokenRecord.token,
          notification: { title, body: message },
          data: { type, notificationId: savedNotification.id },
        });
      } catch (error) {
        console.error(`Failed to send push notification to token ${tokenRecord.token}:`, error);
      }
    }

    return { status: 'success', data: savedNotification };
  }

  // --- Device Push Token Management ---

  async registerPushToken(userId: string, token: string, provider: string = 'fcm') {
    let existingToken = await this.pushTokenRepo.findOne({ where: { token } });
    
    if (existingToken) {
      existingToken.userId = userId;
      existingToken.provider = provider;
      await this.pushTokenRepo.save(existingToken);
    } else {
      existingToken = this.pushTokenRepo.create({ userId, token, provider });
      await this.pushTokenRepo.save(existingToken);
    }

    return { status: 'success', message: 'Push token registered successfully' };
  }

  async removePushToken(token: string) {
    await this.pushTokenRepo.delete({ token });
    return { status: 'success', message: 'Push token removed successfully' };
  }

  // --- In-App Notification CRUD Methods ---

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