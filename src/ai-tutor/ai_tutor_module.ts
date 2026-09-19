// src/ai-tutor/ai-tutor.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TutorSession } from './entities/tutor-session.entity.js';
import { TutorMessage } from './entities/tutor-message.entity.js';
import { AiTutorService } from './ai-tutor.service.js';
import { AiTutorController } from './ai-tutor.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([TutorSession, TutorMessage])],
  controllers: [AiTutorController],
  providers: [AiTutorService],
  exports: [AiTutorService],
})
export class AiTutorModule {}