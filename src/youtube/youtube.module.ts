// src/youtube/youtube.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { YoutubeController } from './youtube.controller.js';
import { YoutubeService } from './youtube.service.js';
import { YoutubeEntity } from './entities/youtube.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([YoutubeEntity])],
  controllers: [YoutubeController],
  providers: [YoutubeService],
  exports: [YoutubeService],
})
export class YoutubeModule {}