// src/study-sessions/study-sessions.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudySession } from './entities/study-session.entity.js';
import { StudySessionsService } from './services/study-sessions.service.js';
import { StudySessionsController } from './controllers/study-sessions.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([StudySession])],
  controllers: [StudySessionsController],
  providers: [StudySessionsService],
  exports: [StudySessionsService],
})
export class StudySessionsModule {}