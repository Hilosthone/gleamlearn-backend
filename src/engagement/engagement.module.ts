import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StreakModule } from '../streak/streak.module.js';
import { XpModule } from '../xp/xp.module.js';
import { CoinsModule } from '../coins/coins.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { EngagementDay, EngagementReward } from './entities.js';
import { EngagementService } from './engagement.service.js';
import { EngagementController } from './engagement.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([EngagementReward, EngagementDay]), StreakModule, XpModule, CoinsModule, NotificationsModule],
  controllers: [EngagementController],
  providers: [EngagementService],
  exports: [EngagementService],
})
export class EngagementModule {}
