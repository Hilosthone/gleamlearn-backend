// src/ai-voice/ai-voice.module.ts
import { Module } from '@nestjs/common';
import { AiVoiceController } from './ai-voice.controller.js';
import { AiVoiceService } from './ai-voice.service.js';

@Module({
  controllers: [AiVoiceController],
  providers: [AiVoiceService],
  exports: [AiVoiceService],
})
export class AiVoiceModule {}