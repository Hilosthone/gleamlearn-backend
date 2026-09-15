// src/tests/tests.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Test } from './entities/test.entity.js';
import { TestsService } from './tests.service.js';
import { TestsController } from './tests.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Test])],
  controllers: [TestsController],
  providers: [TestsService],
  exports: [TestsService],
})
export class TestsModule {}