// src/planner/planner.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThanOrEqual, Between } from 'typeorm';
import { StudyPlanItem } from './entities/study-plan-item.entity.js';
import { CreatePlannerItemDto, GeneratePlannerDto, UpdatePlannerItemDto } from './dto/study-planner.dto.js';
import { randomUUID } from 'node:crypto';
import { PersonalCourse, PersonalCourseModule } from '../learner-content/entities.js';
import { ExamPrep } from '../exam-prep/entities/exam-prep.entity.js';
import { learnerTopicStats } from '../analytics/topic-stats.js';
import { buildSchedule, normaliseIntensity } from './plan-generator.js';
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

  /**
   * Generates study sessions until the deadline from the learner's OWN data (src/planner/plan-generator.ts):
   * targetId is one of their personal courses (unfinished modules, then objectives) or exam-prep plans (subjects);
   * their weak topics from submitted attempts are added. Nothing is invented and no AI is used.
   * Regenerating for the same target replaces only the sessions previously GENERATED for it that are still open and
   * not in the past; sessions the learner added or completed are never touched.
   */
  async generatePlanner(userId: string, dto: GeneratePlannerDto) {
    const deadline = String(dto.deadline ?? '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline) || Number.isNaN(Date.parse(deadline))) throw new BadRequestException('deadline must be a date (YYYY-MM-DD).');
    const m = this.plannerRepo.manager;
    let label: string;
    let topics: string[];
    let examTarget = false;
    let targetType: 'personal_course' | 'exam_prep';
    const course = /^[0-9a-f-]{36}$/i.test(dto.targetId) ? await m.getRepository(PersonalCourse).findOne({ where: { id: dto.targetId, userId } }).catch(() => null) : null;
    if (course) {
      const modules = await m.getRepository(PersonalCourseModule).find({ where: { courseId: course.id, userId }, order: { position: 'ASC' } });
      label = course.title;
      topics = [...modules.filter((x) => !x.isCompleted).map((x) => x.title), ...(course.objectives ?? [])];
      targetType = 'personal_course';
    } else {
      const prep = /^[0-9a-f-]{36}$/i.test(dto.targetId) ? await m.getRepository(ExamPrep).findOne({ where: { id: dto.targetId, userId } }).catch(() => null) : null;
      if (!prep) throw new NotFoundException('Choose one of your courses or exam preparation plans.');
      const plan = (prep.studyPlan ?? {}) as { title?: string; subjects?: string[] };
      label = plan.title || prep.targetSubject || 'your exam';
      topics = Array.isArray(plan.subjects) ? plan.subjects : String(prep.targetSubject ?? '').split(',');
      examTarget = true;
      targetType = 'exam_prep';
    }
    const weak = (await learnerTopicStats(m, userId)).filter((t) => t.total >= 2 && t.percent < 60).map((t) => t.topic);
    const sessions = buildSchedule({ topics: [...topics, ...weak], deadline, intensity: normaliseIntensity(dto.intensity), examTarget, targetLabel: label });
    if (!sessions.length) throw new BadRequestException('The deadline must be at least two days away to plan sessions.');

    const planId = randomUUID();
    const today = new Date().toISOString().slice(0, 10);
    const saved = await m.transaction(async (tx) => {
      const repo = tx.getRepository(StudyPlanItem);
      await repo
        .createQueryBuilder()
        .delete()
        .where('"userId" = :userId AND "isCompleted" = false AND "scheduledDate" >= :today', { userId, today })
        .andWhere(`"metadata"->>'generated' = 'true' AND "metadata"->>'targetId' = :targetId`, { targetId: dto.targetId })
        .execute();
      return repo.save(
        sessions.map((x) =>
          repo.create({ userId, title: x.title.slice(0, 255), description: x.description, scheduledDate: x.scheduledDate, activityType: x.activityType, metadata: { generated: true, planId, targetId: dto.targetId, targetType, topic: x.topic } }),
        ),
      );
    });
    return {
      status: 'success',
      planId,
      target: { id: dto.targetId, type: targetType, title: label },
      sessions: saved.length,
      from: saved[0]?.scheduledDate ?? null,
      to: saved[saved.length - 1]?.scheduledDate ?? null,
      topics: new Set([...topics, ...weak]).size,
      items: saved,
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