// src/recommendations/recommendations.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from '../auth/entities/user.entity.js';
import { Course } from '../courses/entities/course.entity.js';
import { Enrollment } from '../courses/entities/enrollment.entity.js';
import { rankCourses, type RankingResult } from './course-ranking.js';
import { recommendExams, recommendQuizzes, recommendRevision, recommendTopics } from './learning-recommendations.js';

/**
 * Recommendations from the real catalogue (courses, ranked by the learner's profile) and from the learner's own
 * records (topics, quizzes, revision, exams). The AI service's old recommendation routes are no longer called: they
 * ignored the learner and invented catalogue items.
 */
@Injectable()
export class RecommendationsService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Catalogue courses ranked by the learner's profile (education type, class/level, exam goals, course of study),
   * excluding courses they already take. See course-ranking.ts; every reason names the profile value it used.
   */
  async recommendCourses(userId: string): Promise<RankingResult> {
    const user = await this.dataSource.getRepository(User).findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Learner not found.');
    const [courses, enrolled] = await Promise.all([
      this.dataSource.getRepository(Course).find({ relations: { department: true }, order: { createdAt: 'DESC' } }),
      this.dataSource.getRepository(Enrollment).find({ where: { userId }, select: { courseId: true } }),
    ]);
    const catalogue = courses.map((c) => ({ id: c.id, title: c.title, description: c.description ?? null, track: c.track ?? null, level: c.level ?? null, departmentName: c.department?.name ?? null }));
    const u = user as unknown as Record<string, string | null | undefined>;
    return rankCourses(
      { educationType: u.educationType, secondaryClass: u.secondaryClass, level: u.level, examAimOrGoals: u.examAimOrGoals, courseOfStudy: u.courseOfStudy, department: u.department, faculty: u.faculty },
      catalogue,
      new Set(enrolled.map((e) => e.courseId)),
    );
  }

  // Computed from the learner's own records; see learning-recommendations.ts (each item carries its reason).
  async topics(userId: string) {
    return { status: 'success', items: await recommendTopics(this.dataSource, userId) };
  }

  async quizzes(userId: string) {
    return { status: 'success', items: await recommendQuizzes(this.dataSource, userId) };
  }

  async revision(userId: string) {
    return { status: 'success', items: await recommendRevision(this.dataSource, userId) };
  }

  async exams(userId: string) {
    return { status: 'success', items: await recommendExams(this.dataSource, userId) };
  }

  /** Everything at once (the dashboard): each section is independent. */
  async all(userId: string) {
    const [topics, quizzes, revision, exams] = await Promise.all([recommendTopics(this.dataSource, userId), recommendQuizzes(this.dataSource, userId), recommendRevision(this.dataSource, userId), recommendExams(this.dataSource, userId)]);
    return { status: 'success', topics, quizzes, revision, exams };
  }
}
