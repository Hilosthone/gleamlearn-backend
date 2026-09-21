// src/usage/usage.module.ts
import { Module } from '@nestjs/common';
import { UsageController } from './usage.controller.js';
import { UsageService } from './usage.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Module({
  controllers: [UsageController],
  providers: [UsageService, PrismaService],
  exports: [UsageService],
})
export class UsageModule {}