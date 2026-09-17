// src/goals/goals.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudyGoal } from './entities/study-goal.entity.js';
import { GoalsService } from './goals.service.js';
import { GoalsController } from './goals.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([StudyGoal])],
  controllers: [GoalsController],
  providers: [GoalsService],
  exports: [GoalsService],
})
export class GoalsModule {}