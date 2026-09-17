// src/planner/planner.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThanOrEqual, Between } from 'typeorm';
import { StudyPlanItem } from './entities/study-plan-item.entity.js';
import { GeneratePlannerDto, UpdatePlannerItemDto } from './dto/study-planner.dto.js';

@Injectable()
export class PlannerService {
  constructor(
    @InjectRepository(StudyPlanItem)
    private plannerRepo: Repository<StudyPlanItem>,
  ) {}

  async generatePlanner(userId: string, dto: GeneratePlannerDto) {
    // Clear any existing active pending plan items or generate fresh blocks
    // Simulating AI schedule generation algorithm splitting topics across days leading up to the deadline
    const sampleItems = [
      {
        userId,
        title: 'Module Review & Core Concepts',
        description: `AI-generated study session based on target ${dto.targetId}`,
        scheduledDate: new Date().toISOString().split('T')[0],
        startTime: '09:00 AM',
        endTime: '11:00 AM',
        activityType: 'study',
      },
      {
        userId,
        title: 'Practice Quiz & Knowledge Check',
        description: 'Test retention on newly covered topics',
        scheduledDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
        startTime: '02:00 PM',
        endTime: '03:30 PM',
        activityType: 'quiz_practice',
      },
    ];

    const createdItems = this.plannerRepo.create(sampleItems);
    const saved = await this.plannerRepo.save(createdItems);

    return {
      status: 'success',
      message: 'AI study plan generated successfully.',
      totalSessions: saved.length,
      schedule: saved,
    };
  }

  async getAllPlannerItems(userId: string) {
    const items = await this.plannerRepo.find({
      where: { userId },
      order: { scheduledDate: 'ASC' },
    });
    return {
      status: 'success',
      count: items.length,
      schedule: items,
    };
  }

  async getTodayPlanner(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    const items = await this.plannerRepo.find({
      where: { userId, scheduledDate: today },
      order: { startTime: 'ASC' },
    });
    return {
      status: 'success',
      date: today,
      count: items.length,
      schedule: items,
    };
  }

  async getWeekPlanner(userId: string) {
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    const endDate = nextWeek.toISOString().split('T')[0];

    const items = await this.plannerRepo.find({
      where: {
        userId,
        scheduledDate: Between(startDate, endDate),
      },
      order: { scheduledDate: 'ASC' },
    });

    return {
      status: 'success',
      range: { startDate, endDate },
      count: items.length,
      schedule: items,
    };
  }

  async getMonthPlanner(userId: string) {
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    
    const nextMonth = new Date();
    nextMonth.setMonth(today.getMonth() + 1);
    const endDate = nextMonth.toISOString().split('T')[0];

    const items = await this.plannerRepo.find({
      where: {
        userId,
        scheduledDate: Between(startDate, endDate),
      },
      order: { scheduledDate: 'ASC' },
    });

    return {
      status: 'success',
      range: { startDate, endDate },
      count: items.length,
      schedule: items,
    };
  }

  async updateItem(userId: string, id: string, dto: UpdatePlannerItemDto) {
    const item = await this.plannerRepo.findOne({ where: { id, userId } });
    if (!item) {
      throw new NotFoundException(`Study plan item with ID ${id} not found.`);
    }

    Object.assign(item, dto);
    const updated = await this.plannerRepo.save(item);
    return {
      status: 'success',
      message: 'Study plan item updated successfully.',
      item: updated,
    };
  }

  async completeItem(userId: string, id: string) {
    const item = await this.plannerRepo.findOne({ where: { id, userId } });
    if (!item) {
      throw new NotFoundException(`Study plan item with ID ${id} not found.`);
    }

    item.isCompleted = true;
    item.isSkipped = false;
    const updated = await this.plannerRepo.save(item);

    return {
      status: 'success',
      message: 'Study session marked as completed.',
      item: updated,
    };
  }

  async skipItem(userId: string, id: string) {
    const item = await this.plannerRepo.findOne({ where: { id, userId } });
    if (!item) {
      throw new NotFoundException(`Study plan item with ID ${id} not found.`);
    }

    item.isSkipped = true;
    const updated = await this.plannerRepo.save(item);

    return {
      status: 'success',
      message: 'Study session marked as skipped.',
      item: updated,
    };
  }

  async regeneratePlanner(userId: string) {
    const today = new Date().toISOString().split('T')[0];

    // 1. Identify uncompleted and skipped sessions from today onwards
    const missedItems = await this.plannerRepo.find({
      where: {
        userId,
        scheduledDate: LessThanOrEqual(today),
        isCompleted: false,
      },
    });

    // 2. Clear or compress old uncompleted backlog items
    if (missedItems.length > 0) {
      // AI Re-indexing logic: Redistribute missed topics across future dates
      for (const missed of missedItems) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 2); // Push forward by 2 days
        missed.scheduledDate = futureDate.toISOString().split('T')[0];
        missed.isSkipped = false;
        await this.plannerRepo.save(missed);
      }
    }

    const refreshedSchedule = await this.plannerRepo.find({
      where: { userId, scheduledDate: MoreThanOrEqual(today) },
      order: { scheduledDate: 'ASC' },
    });

    return {
      status: 'success',
      message: 'AI Study Plan successfully regenerated to account for missed sessions and backlog.',
      missedSessionsAdjusted: missedItems.length,
      newScheduleCount: refreshedSchedule.length,
      schedule: refreshedSchedule,
    };
  }
}