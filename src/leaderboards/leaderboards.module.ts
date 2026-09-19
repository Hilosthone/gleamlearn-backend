// src/leaderboards/leaderboards.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaderboardsController } from './leaderboards.controller.js';
import { LeaderboardsService } from './leaderboards.service.js';
import { User } from '../auth/entities/user.entity.js';
import { XpTransaction } from '../xp/entities/xp-transaction.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([User, XpTransaction])],
  controllers: [LeaderboardsController],
  providers: [LeaderboardsService],
  exports: [LeaderboardsService],
})
export class LeaderboardsModule {}