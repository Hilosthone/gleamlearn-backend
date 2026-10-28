// src/goals/goals.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudyGoal } from './entities/study-goal.entity.js';
import { CreateStudyGoalDto, UpdateStudyGoalDto } from './dto/study-goal.dto.js';
import { stripProtectedFields } from '../common/utils/strip-protected.js';

@Injectable()
export class GoalsService {
  constructor(
    @InjectRepository(StudyGoal)
    private goalsRepo: Repository<StudyGoal>,
  ) {}

  async findAll(userId: string) {
    const goals = await this.goalsRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
    return {
      status: 'success',
      count: goals.length,
      goals,
    };
  }

  async findOne(userId: string, id: string) {
    const goal = await this.goalsRepo.findOne({ where: { id, userId } });
    if (!goal) {
      throw new NotFoundException(`Study goal with ID ${id} not found.`);
    }
    return {
      status: 'success',
      goal,
    };
  }

  async create(userId: string, dto: CreateStudyGoalDto) {
    // userId last and protected fields dropped: the body cannot pick the owner or the row id
    const goal = this.goalsRepo.create({
      ...stripProtectedFields(dto),
      userId,
    });
    const saved = await this.goalsRepo.save(goal);
    return {
      status: 'success',
      message: 'Study goal created successfully.',
      goal: saved,
    };
  }

  async update(userId: string, id: string, dto: UpdateStudyGoalDto) {
    const goalRecord = await this.findOne(userId, id);
    Object.assign(goalRecord.goal, stripProtectedFields(dto)); // `id`/`userId` in the body must not retarget the save
    const goal = goalRecord.goal;
    if (dto.targetValue !== undefined && !(dto.targetValue > 0)) throw new BadRequestException('The target must be more than 0.');
    if (dto.currentValue !== undefined || dto.targetValue !== undefined) {
      // progress is kept within the target; reaching it completes the goal, lowering it below reopens it
      goal.currentValue = Math.min(Math.max(0, Number(goal.currentValue) || 0), goal.targetValue);
      goal.isCompleted = goal.targetValue > 0 && goal.currentValue >= goal.targetValue;
    }
    const updated = await this.goalsRepo.save(goal);
    return {
      status: 'success',
      message: 'Study goal updated successfully.',
      goal: updated,
    };
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id); // Ensure it exists
    await this.goalsRepo.delete(id);
    return {
      status: 'success',
      message: `Study goal with ID ${id} deleted successfully.`,
    };
  }

  async completeGoal(userId: string, id: string) {
    const goalRecord = await this.findOne(userId, id);
    goalRecord.goal.isCompleted = true;
    goalRecord.goal.currentValue = goalRecord.goal.targetValue;
    const completed = await this.goalsRepo.save(goalRecord.goal);
    return {
      status: 'success',
      message: 'Study goal marked as completed.',
      goal: completed,
    };
  }

  async getGoalProgress(userId: string, id: string) {
    const goalRecord = await this.findOne(userId, id);
    const goal = goalRecord.goal;
    const percentage = goal.targetValue > 0 
      ? Math.min(100, Number(((goal.currentValue / goal.targetValue) * 100).toFixed(2)))
      : 0;

    return {
      status: 'success',
      goalId: goal.id,
      title: goal.title,
      targetValue: goal.targetValue,
      currentValue: goal.currentValue,
      progressPercentage: percentage,
      isCompleted: goal.isCompleted,
      targetDate: goal.targetDate,
    };
  }
}