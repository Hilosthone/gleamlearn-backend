// src/courses/courses.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Course } from './entities/course.entity.js';
import { Topic } from './entities/topic.entity.js';
import { Enrollment } from './entities/enrollment.entity.js';
import { LessonEntity } from '../lessons/entities/lesson.entity.js';
import { LessonProgressEntity } from '../lessons/entities/lesson-progress.entity.js';
import { CreateCourseDto, UpdateCourseDto, CreateTopicDto, UpdateTopicDto } from './dto/course.dto.js';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course) private courseRepo: Repository<Course>,
    @InjectRepository(Topic) private topicRepo: Repository<Topic>,
    @InjectRepository(Enrollment) private enrollmentRepo: Repository<Enrollment>,
  ) {}

  // Courses CRUD & Search
  findAllCourses() {
    return this.courseRepo.find({ relations: { department: true, topics: true } });
  }

  async findCourseById(id: string) {
    const course = await this.courseRepo.findOne({ where: { id }, relations: { department: true, topics: true } });
    if (!course) throw new NotFoundException(`Course not found`);
    return course;
  }

  createCourse(dto: CreateCourseDto) {
    const course = this.courseRepo.create(dto);
    return this.courseRepo.save(course);
  }

  async updateCourse(id: string, dto: UpdateCourseDto) {
    await this.courseRepo.update(id, dto);
    return this.findCourseById(id);
  }

  async deleteCourse(id: string) {
    const result = await this.courseRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException('Course not found');
    return { message: 'Course successfully deleted' };
  }

  async searchCourses(query: string, track?: string, level?: string) {
    // Omitted filters must not appear in the where clause (undefined values made TypeORM throw → 500), and
    // LIKE wildcards in the query are escaped so they match literally.
    const term = `%${String(query ?? '').replace(/[%_\\]/g, (ch) => `\\${ch}`)}%`;
    const filters = { ...(track ? { track } : {}), ...(level ? { level } : {}) };
    return this.courseRepo.find({
      where: [
        { title: ILike(term), ...filters },
        { description: ILike(term), ...filters },
      ],
      relations: { department: true },
    });
  }

  // Topics Management
  async findTopicsByCourse(courseId: string) {
    await this.findCourseById(courseId); // verify course exists
    return this.topicRepo.find({ where: { courseId }, order: { order: 'ASC' } });
  }

  async createTopic(courseId: string, dto: CreateTopicDto) {
    await this.findCourseById(courseId);
    const topic = this.topicRepo.create({ ...dto, courseId });
    return this.topicRepo.save(topic);
  }

  async findTopicById(id: string) {
    const topic = await this.topicRepo.findOne({ where: { id }, relations: { course: true } });
    if (!topic) throw new NotFoundException('Topic not found');
    return topic;
  }

  async updateTopic(id: string, dto: UpdateTopicDto) {
    await this.topicRepo.update(id, dto);
    return this.findTopicById(id);
  }

  async deleteTopic(id: string) {
    const result = await this.topicRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException('Topic not found');
    return { message: 'Topic successfully deleted' };
  }

  // Enrollments
  async enrollUser(userId: string, courseId: string) {
    await this.findCourseById(courseId);
    try {
      const enrollment = this.enrollmentRepo.create({ userId, courseId });
      return await this.enrollmentRepo.save(enrollment);
    } catch {
      throw new ConflictException('Already enrolled in this course');
    }
  }

  async unenrollUser(userId: string, courseId: string) {
    const result = await this.enrollmentRepo.delete({ userId, courseId });
    if (result.affected === 0) throw new NotFoundException('Enrollment not found');
    return { message: 'Successfully unenrolled from course' };
  }

  async findUserEnrolledCourses(userId: string) {
    const enrollments = await this.enrollmentRepo.find({
      where: { userId },
      relations: { course: { department: true } },
    });
    // enrollments.progressPercentage is never written anywhere, so it was always 0. Progress is computed from the
    // learner's completed lessons in each course (lesson_progress), which is what the lesson pages record.
    return Promise.all(
      enrollments.map(async (e) => ({
        ...e.course,
        progressPercentage: await this.courseProgressPercent(userId, e.courseId, e.progressPercentage),
        enrolledAt: e.enrolledAt,
      })),
    );
  }

  /** Completed lessons / total lessons for this learner in a course (0–100). Falls back to the stored value. */
  async courseProgressPercent(userId: string, courseId: string, stored = 0): Promise<number> {
    const manager = this.enrollmentRepo.manager;
    const total = await manager.count(LessonEntity, { where: { courseId } });
    if (!total) return stored ?? 0;
    const completed = await manager
      .createQueryBuilder(LessonProgressEntity, 'p')
      // lessons.id is uuid, lesson_progress.lessonId is varchar (no FK): compare as text
      .innerJoin(LessonEntity, 'l', 'CAST(l.id AS text) = p.lessonId')
      .where('p.userId = :userId', { userId })
      .andWhere('l.courseId = :courseId', { courseId })
      .andWhere('p.isCompleted = true')
      .getCount();
    return Math.round((completed / total) * 100);
  }
}