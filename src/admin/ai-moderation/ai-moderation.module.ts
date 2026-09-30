// src/admin/ai-moderation/ai-moderation.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModerationController } from './ai-moderation.controller.js';
import { AiModerationService } from './ai-moderation.service.js';
import { AiGeneratedContent } from './entities/ai-generated-content.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([AiGeneratedContent])],
  controllers: [AiModerationController],
  providers: [AiModerationService],
  exports: [AiModerationService],
})
export class AiModerationModule {}