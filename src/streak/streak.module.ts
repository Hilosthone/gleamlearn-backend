// src/streak/streak.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserStreak } from './entities/user-streak.entity.js';
import { StreakHistory } from './entities/streak-history.entity.js';
import { StreakService } from './streak.service.js';
import { StreakController } from './streak.controller.js';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { StreakActivityInterceptor } from './streak-activity.js';

@Module({
  imports: [TypeOrmModule.forFeature([UserStreak, StreakHistory])],
  controllers: [StreakController],
  providers: [StreakService, { provide: APP_INTERCEPTOR, useClass: StreakActivityInterceptor }],
  exports: [StreakService],
})
export class StreakModule {}