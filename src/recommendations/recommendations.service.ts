// src/recommendations/recommendations.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { featureUnavailable } from '../common/errors/feature-unavailable.js';
import { User } from '../auth/entities/user.entity.js';
import { Course } from '../courses/entities/course.entity.js';
import { Enrollment } from '../courses/entities/enrollment.entity.js';
import { rankCourses, type RankingResult } from './course-ranking.js';

/**
 * Personalised recommendations are not implemented. The AI service's recommendation routes ignore the learner
 * (the userId sent here was never used): they ask the model for generic suggestions, so it invented courses and
 * ids that are not in the catalogue. Until recommendations are computed from the real catalogue and the
 * learner's progress, every route answers 501 FEATURE_UNAVAILABLE without calling the AI service.
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

  async proxyToPython(_path: string): Promise<never> {
    throw featureUnavailable('Personalised recommendations', 'recommendations are not yet computed from the catalogue and your progress');
  }
}
