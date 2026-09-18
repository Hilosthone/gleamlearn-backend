// src/xp/xp.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { XpController } from './xp.controller.js';
import { XpService } from './xp.service.js';
import { XpTransaction } from './entities/xp-transaction.entity.js';
import { User } from '../auth/entities/user.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([XpTransaction, User])],
  controllers: [XpController],
  providers: [XpService],
  exports: [XpService], // Exported so other modules (like Quizzes) can inject XpService and award points!
})
export class XpModule {}