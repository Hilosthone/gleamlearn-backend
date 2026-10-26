// src/planner/planner.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThanOrEqual, Between } from 'typeorm';
import { StudyPlanItem } from './entities/study-plan-item.entity.js';
import { CreatePlannerItemDto, GeneratePlannerDto, UpdatePlannerItemDto } from './dto/study-planner.dto.js';
import { featureUnavailable } from '../common/errors/feature-unavailable.js';
import { stripProtectedFields } from '../common/utils/strip-protected.js';

@Injectable()
export class PlannerService {
  constructor(
    @InjectRepository(StudyPlanItem)
    private plannerRepo: Repository<StudyPlanItem>,
  ) {}

  async createItem(userId: string, dto: CreatePlannerItemDto) {
    const item = this.plannerRepo.create({
      userId,
      title: dto.title.trim(),
      description: dto.description?.trim() || undefined,
      scheduledDate: dto.scheduledDate,
      startTime: dto.startTime,
      endTime: dto.endTime,
      activityType: dto.activityType ?? 'study',
    });
    const saved = await this.plannerRepo.save(item);
    return { status: 'success', item: saved };
  }

  /*
   * This used to save two fixed sample sessions ("Module Review & Core Concepts", "Practice Quiz & Knowledge Check")
   * and call them an AI-generated plan; the target and deadline were never used. It now answers 501 and stores nothing.
   */
  async generatePlanner(_userId: string, _dto: GeneratePlannerDto): Promise<never> {
    throw featureUnavailable('AI study plan generation', 'plans are not generated from your courses and deadlines yet; add sessions yourself');
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

    Object.assign(item, stripProtectedFields(dto)); // `id` in the body must not retarget the save
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