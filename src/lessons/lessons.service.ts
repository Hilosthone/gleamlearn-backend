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
  async startLesson(lessonId: string, userId: string) {
    await this.findLessonById(lessonId);
    let progress = await this.progressRepo.findOne({ where: { lessonId, userId } });
    if (!progress) {
      progress = this.progressRepo.create({ lessonId, userId, startedAt: new Date() });
    } else if (!progress.startedAt) {
      progress.startedAt = new Date();
    }
    return this.progressRepo.save(progress);
  }

  async completeLesson(lessonId: string, userId: string) {
    await this.findLessonById(lessonId);
    let progress = await this.progressRepo.findOne({ where: { lessonId, userId } });
    if (!progress) {
      progress = this.progressRepo.create({ lessonId, userId, startedAt: new Date() });
    }
    progress.isCompleted = true;
    progress.completedAt = new Date();
    return this.progressRepo.save(progress);
  }

  async getLessonProgress(lessonId: string, userId: string) {
    const progress = await this.progressRepo.findOne({ where: { lessonId, userId } });
    if (!progress) {
      return { lessonId, userId, isCompleted: false, startedAt: null, completedAt: null };
    }
    return progress;
  }
}