// src/admin/content/admin-content.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, ILike } from 'typeorm';
import { CoursesService } from '../../courses/courses.service.js';
import { LessonsService } from '../../lessons/lessons.service.js';
import { Course } from '../../courses/entities/course.entity.js';
import { Topic } from '../../courses/entities/topic.entity.js';
import { CatalogIntegrityService } from '../../courses/catalog-integrity.service.js';
import { Department } from '../../academic/entities/department.entity.js';
import {
  AdminContentQueryDto,
  AdminCreateCourseDto,
  AdminCreateLessonDto,
  AdminCreateTopicDto,
  AdminUpdateCourseDto,
  AdminUpdateLessonDto,
  AdminUpdateTopicDto,
} from './dto/admin-content.dto.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function pick<T extends object>(source: T, keys: readonly (keyof T)[]): Partial<T> {
  const out: Partial<T> = {};
  for (const key of keys) if (source[key] !== undefined) out[key] = source[key];
  return out;
}

/**
 * Admin management of the CANONICAL learner catalog: `courses`, `topics`, `lessons`
 * (the tables the learner app reads). It reuses CoursesService / LessonsService for writes and
 * only adds admin concerns: pagination, counts, field allowlists, existence checks and safe deletes.
 *
 * Safe deletes: a course/topic/lesson is only deleted when no learner data depends on it. Otherwise
 * 409 with the counts. (Course deletion would CASCADE topics and enrollments; lesson and topic
 * progress rows have no foreign key and would be orphaned.)
 */
@Injectable()
export class AdminContentService {
  constructor(
    private readonly courses: CoursesService,
    private readonly lessons: LessonsService,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly integrity: CatalogIntegrityService,
  ) {}

  private repo<T extends object>(entity: new () => T) {
    return this.dataSource.getRepository(entity);
  }

  private requireUuid(id: string, what: string) {
    if (typeof id !== 'string' || !UUID.test(id)) throw new NotFoundException(`${what} not found`);
  }

  private async assertDepartment(departmentId?: string) {
    if (!departmentId) return;
    const exists = await this.repo(Department).count({ where: { id: departmentId } as any });
    if (!exists) throw new BadRequestException('departmentId does not match an existing department');
  }

  // ---------------- Courses ----------------

  async listCourses(query: AdminContentQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const search = query.search?.trim();
    const [courses, total] = await this.repo(Course).findAndCount({
      where: search ? { title: ILike(`%${search.replace(/[%_\\]/g, (c) => `\\${c}`)}%`) } : {},
      order: { createdAt: 'DESC' } as any,
      skip: (page - 1) * limit,
      take: limit,
    });
    const withCounts = await Promise.all(courses.map(async (c) => ({ ...c, ...(await this.courseCounts(c.id)) })));
    return { status: 'success', data: { courses: withCounts, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } } };
  }

  private courseCounts(courseId: string) {
    return this.integrity.courseCounts(courseId);
  }

  async getCourse(id: string) {
    this.requireUuid(id, 'Course');
    const course = await this.courses.findCourseById(id);
    const [lessons, counts] = await Promise.all([this.lessons.findLessonsByCourse(id), this.courseCounts(id)]);
    const topics = [...(course.topics ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return { status: 'success', data: { ...course, topics, lessons, ...counts } };
  }

  async createCourse(dto: AdminCreateCourseDto) {
    await this.assertDepartment(dto.departmentId);
    const course = await this.courses.createCourse(pick(dto, ['title', 'description', 'track', 'level', 'departmentId']) as any);
    return { status: 'success', message: 'Course created', data: course };
  }

  async updateCourse(id: string, dto: AdminUpdateCourseDto) {
    this.requireUuid(id, 'Course');
    await this.courses.findCourseById(id);
    const changes = pick(dto, ['title', 'description', 'track', 'level', 'departmentId']);
    if (Object.keys(changes).length === 0) throw new BadRequestException('No changes provided');
    await this.assertDepartment(changes.departmentId);
    await this.repo(Course).update(id, changes as any);
    return { status: 'success', message: 'Course updated', data: await this.courses.findCourseById(id) };
  }

  async deleteCourse(id: string) {
    this.requireUuid(id, 'Course');
    await this.courses.findCourseById(id);
    await this.integrity.assertCourseDeletable(id);
    await this.courses.deleteCourse(id);
    return { status: 'success', message: 'Course deleted' };
  }

  // ---------------- Topics ----------------

  async createTopic(courseId: string, dto: AdminCreateTopicDto) {
    this.requireUuid(courseId, 'Course');
    const topic = await this.courses.createTopic(courseId, pick(dto, ['title', 'description', 'order']) as any);
    return { status: 'success', message: 'Topic created', data: topic };
  }

  async updateTopic(id: string, dto: AdminUpdateTopicDto) {
    this.requireUuid(id, 'Topic');
    await this.courses.findTopicById(id);
    const changes = pick(dto, ['title', 'description', 'order']);
    if (Object.keys(changes).length === 0) throw new BadRequestException('No changes provided');
    await this.repo(Topic).update(id, changes as any);
    return { status: 'success', message: 'Topic updated', data: await this.courses.findTopicById(id) };
  }

  async deleteTopic(id: string) {
    this.requireUuid(id, 'Topic');
    await this.courses.findTopicById(id);
    await this.integrity.assertTopicDeletable(id);
    await this.courses.deleteTopic(id);
    return { status: 'success', message: 'Topic deleted' };
  }

  // ---------------- Lessons ----------------

  async createLesson(courseId: string, dto: AdminCreateLessonDto) {
    this.requireUuid(courseId, 'Course');
    await this.courses.findCourseById(courseId); // the lesson service does not check the course exists
    const lesson = await this.lessons.createLesson(courseId, pick(dto, ['title', 'content', 'orderIndex']));
    return { status: 'success', message: 'Lesson created', data: lesson };
  }

  async updateLesson(id: string, dto: AdminUpdateLessonDto) {
    this.requireUuid(id, 'Lesson');
    const changes = pick(dto, ['title', 'content', 'orderIndex']);
    if (Object.keys(changes).length === 0) throw new BadRequestException('No changes provided');
    const lesson = await this.lessons.updateLesson(id, changes);
    return { status: 'success', message: 'Lesson updated', data: lesson };
  }

  async deleteLesson(id: string) {
    this.requireUuid(id, 'Lesson');
    await this.lessons.findLessonById(id);
    await this.integrity.assertLessonDeletable(id);
    await this.lessons.removeLesson(id);
    return { status: 'success', message: 'Lesson deleted' };
  }
}
