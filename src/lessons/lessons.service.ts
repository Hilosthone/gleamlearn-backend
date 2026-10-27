// src/lessons/lessons.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LessonEntity } from './entities/lesson.entity.js';
import { LessonProgressEntity } from './entities/lesson-progress.entity.js';

@Injectable()
export class LessonsService {
  constructor(
    @InjectRepository(LessonEntity) private lessonRepo: Repository<LessonEntity>,
    @InjectRepository(LessonProgressEntity) private progressRepo: Repository<LessonProgressEntity>,
  ) {}

  // --- Course Lessons CRUD ---
  async findLessonsByCourse(courseId: string) {
    return this.lessonRepo.find({ where: { courseId }, order: { orderIndex: 'ASC' } });
  }

  async findLessonById(id: string) {
    const lesson = await this.lessonRepo.findOne({ where: { id } });
    if (!lesson) throw new NotFoundException(`Lesson with ID ${id} not found`);
    return lesson;
  }

  async createLesson(courseId: string, dto: any) {
    const lesson = this.lessonRepo.create({ ...dto, courseId });
    return this.lessonRepo.save(lesson);
  }

  async updateLesson(id: string, dto: any) {
    const lesson = await this.findLessonById(id);
    Object.assign(lesson, dto);
    return this.lessonRepo.save(lesson);
  }

  async removeLesson(id: string) {
    const lesson = await this.findLessonById(id);
    await this.lessonRepo.remove(lesson);
    return { status: 'success', message: `Lesson ${id} deleted successfully` };
  }

  // --- Lesson Progress Tracking ---
  /**
   * Applies `change` to the learner's progress row, creating it if needed. Opening a lesson (start) and
   * "Mark as complete" can run at the same moment: both found no row and both inserted, and the second failed
   * the UNIQUE (userId, lessonId) constraint with a 500. If another request created the row first, re-read it
   * and apply the change to that row instead.
   */
  private async updateProgress(lessonId: string, userId: string, change: (p: LessonProgressEntity) => void) {
    for (let attempt = 0; ; attempt++) {
      let progress = await this.progressRepo.findOne({ where: { lessonId, userId } });
      if (!progress) progress = this.progressRepo.create({ lessonId, userId, startedAt: new Date() });
      change(progress);
      try {
        return await this.progressRepo.save(progress);
      } catch (err) {
        const code = (err as { driverError?: { code?: string } })?.driverError?.code;
        if (code !== '23505' || attempt > 0) throw err; // unique_violation: the row now exists, retry once
      }
    }
  }

  async startLesson(lessonId: string, userId: string) {
    await this.findLessonById(lessonId);
    return this.updateProgress(lessonId, userId, (p) => {
      if (!p.startedAt) p.startedAt = new Date();
    });
  }

  async completeLesson(lessonId: string, userId: string) {
    await this.findLessonById(lessonId);
    return this.updateProgress(lessonId, userId, (p) => {
      p.isCompleted = true;
      p.completedAt = new Date();
    });
  }

  async getLessonProgress(lessonId: string, userId: string) {
    const progress = await this.progressRepo.findOne({ where: { lessonId, userId } });
    if (!progress) {
      return { lessonId, userId, isCompleted: false, startedAt: null, completedAt: null };
    }
    return progress;
  }
}