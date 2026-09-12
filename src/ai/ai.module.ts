// src/ai/ai.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiContentEntity } from './entities/ai-content.entity.js';
import { AiService } from './ai.service.js';
import { AiController } from './ai.controller.js';
import { FilesModule } from '../files/files.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([AiContentEntity]),
    FilesModule, // Gives access to find uploaded files by ID
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}