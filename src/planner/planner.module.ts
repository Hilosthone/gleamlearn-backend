// src/planner/planner.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudyPlanItem } from './entities/study-plan-item.entity.js';
import { PlannerService } from './planner.service.js';
import { PlannerController } from './planner.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([StudyPlanItem])],
  controllers: [PlannerController],
  providers: [PlannerService],
  exports: [PlannerService],
})
export class PlannerModule {}