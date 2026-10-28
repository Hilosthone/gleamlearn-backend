import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { User } from '../auth/entities/user.entity.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([User]), NotificationsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // Exported in case AuthModule or others need it later
})
export class UsersModule {}