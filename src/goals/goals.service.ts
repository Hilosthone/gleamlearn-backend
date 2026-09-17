// src/goals/goals.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudyGoal } from './entities/study-goal.entity.js';
import { CreateStudyGoalDto, UpdateStudyGoalDto } from './dto/study-goal.dto.js';

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
    const goal = this.goalsRepo.create({
      userId,
      ...dto,
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
    Object.assign(goalRecord.goal, dto);
    const updated = await this.goalsRepo.save(goalRecord.goal);
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