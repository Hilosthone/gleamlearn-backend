// src/personal-ai-companion/personal-ai-companion.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiCompanion } from './entities/ai-companion.entity.js';
import { PersonalAiCompanionService } from './personal-ai-companion.service.js';
import { PersonalAiCompanionController } from './personal-ai-companion.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([AiCompanion])],
  controllers: [PersonalAiCompanionController],
  providers: [PersonalAiCompanionService],
  exports: [PersonalAiCompanionService],
})
export class PersonalAiCompanionModule {}