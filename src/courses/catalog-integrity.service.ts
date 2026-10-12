// src/courses/catalog-integrity.service.ts
import { ConflictException, Global, Injectable, Module } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Topic } from './entities/topic.entity.js';
import { Enrollment } from './entities/enrollment.entity.js';
import { Course } from './entities/course.entity.js';
import { LessonEntity } from '../lessons/entities/lesson.entity.js';
import { LessonProgressEntity } from '../lessons/entities/lesson-progress.entity.js';
import { TopicMastery } from '../progress/entities/topic-mastery.entity.js';
import { UserProgress } from '../progress/entities/user-progress.entity.js';
import { Faculty } from '../academic/entities/faculty.entity.js';
import { Department } from '../academic/entities/department.entity.js';

/**
 * Checks that run BEFORE any catalog or academic record is deleted, wherever the delete comes from
 * (admin content API or the legacy /api/v1 routes). A delete is refused with 409 when it would destroy
 * or orphan dependent data:
 *
 * - course: topics and enrollments are ON DELETE CASCADE; lessons (no FK) would be orphaned
 * - topic: topic_masteries / user_progress rows (no FK) would be orphaned
 * - lesson: lesson_progress rows (no FK) would be orphaned
 * - institution → faculties → departments are ON DELETE CASCADE; courses.departmentId is SET NULL
 */
@Injectable()
export class CatalogIntegrityService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private count(entity: new () => object, where: Record<string, unknown>) {
    return this.dataSource.getRepository(entity).count({ where } as any);
  }

  async courseCounts(courseId: string) {
    const [topicCount, lessonCount, enrollmentCount] = await Promise.all([
      this.count(Topic, { courseId }),
      this.count(LessonEntity, { courseId }),
      this.count(Enrollment, { courseId }),
    ]);
    return { topicCount, lessonCount, enrollmentCount };
  }

  async assertCourseDeletable(courseId: string) {
    const counts = await this.courseCounts(courseId);
    if (counts.enrollmentCount || counts.lessonCount || counts.topicCount) {
      throw new ConflictException({
        statusCode: 409,
        message: 'This course still has topics, lessons or enrollments. Remove them first; enrolled learners would lose their progress.',
        ...counts,
      });
    }
  }

  async assertTopicDeletable(topicId: string) {
    const [mastery, progress] = await Promise.all([this.count(TopicMastery, { topicId }), this.count(UserProgress, { topicId })]);
    if (mastery || progress) {
      throw new ConflictException({
        statusCode: 409,
        message: 'Learners have progress recorded for this topic, so it cannot be deleted.',
        masteryRecords: mastery,
        progressRecords: progress,
      });
    }
  }

  async assertLessonDeletable(lessonId: string) {
    const progress = await this.count(LessonProgressEntity, { lessonId });
    if (progress) {
      throw new ConflictException({
        statusCode: 409,
        message: 'Learners have progress recorded for this lesson, so it cannot be deleted.',
        progressRecords: progress,
      });
    }
  }

  async assertInstitutionDeletable(institutionId: string) {
    const faculties = await this.count(Faculty, { institutionId });
    if (faculties) {
      throw new ConflictException({
        statusCode: 409,
        message: 'This institution still has faculties. Deleting it would also delete them and their departments.',
        facultyCount: faculties,
      });
    }
  }

  async assertFacultyDeletable(facultyId: string) {
    const departments = await this.count(Department, { facultyId });
    if (departments) {
      throw new ConflictException({
        statusCode: 409,
        message: 'This faculty still has departments. Deleting it would also delete them.',
        departmentCount: departments,
      });
    }
  }

  async assertDepartmentDeletable(departmentId: string) {
    const courses = await this.count(Course, { departmentId });
    if (courses) {
      throw new ConflictException({
        statusCode: 409,
        message: 'Courses are linked to this department. Reassign them first.',
        courseCount: courses,
      });
    }
  }
}

/** Global so CoursesModule, LessonsModule, AcademicModule and the admin content module share one instance. */
@Global()
@Module({
  providers: [CatalogIntegrityService],
  exports: [CatalogIntegrityService],
})
export class CatalogIntegrityModule {}
