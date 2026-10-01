import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityController } from './security.controller.js';
import { SecurityService } from './security.service.js';
import { SecurityEvent } from './entities/security-event.entity.js';
import { User } from '../../auth/entities/user.entity.js';
import { ActivityLog } from '../activity/entities/activity-log.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([SecurityEvent, User, ActivityLog])],
  controllers: [SecurityController],
  providers: [SecurityService],
  exports: [SecurityService],
})
export class AdminSecurityModule {}