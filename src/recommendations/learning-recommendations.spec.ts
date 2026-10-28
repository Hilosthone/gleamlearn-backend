import { RecommendationsController } from './recommendations.controller.js';
import { RecommendationsService } from './recommendations.service.js';
import { Quiz } from '../quizzes/entities/quiz.entity.js';
import { Exam } from '../exams/entities/exam.entity.js';
import { LearningResource, LearnerAssessment, AssessmentAttempt } from '../learning/entities.js';
import { PersonalCourse, PersonalCourseModule } from '../learner-content/entities.js';
import { ExamPrep } from '../exam-prep/entities/exam-prep.entity.js';

/** A DataSource double: repositories filter rows by the `where` given; raw queries return fixed rows. */
function ds(tables: Map<unknown, any[]>, raw: { topics?: any[]; examScores?: any[] } = {}) {
  const where = (rows: any[], w: any = {}) => rows.filter((r) => Object.entries(w).every(([k, v]) => r[k] === v));
  return {
    getRepository: (e: unknown) => ({ find: async (o: any = {}) => where(tables.get(e) ?? [], o.where) }),
    query: async (sql: string) => (sql.includes('"review"') ? (sql.includes('official_assessment_attempts') ? (raw.topics ?? []) : []) : (raw.examScores ?? [])),
  } as never;
}

describe('learning recommendations: from the learner’s own records, never invented', () => {
  it('a new learner gets empty lists (and the AI service is not called)', async () => {
    const c = new RecommendationsController(new RecommendationsService(ds(new Map())));
    expect(await c.getAll({ id: 'u1' })).toEqual({ status: 'success', topics: [], quizzes: [], revision: [], exams: [] });
  });

  it('weak topics, matching quizzes, unfinished work and untaken exams, each with its real reason', async () => {
    const tables = new Map<unknown, any[]>([
      [Quiz, [{ id: 'q1', title: 'Cell structure quiz', topic: 'Cells' }, { id: 'q2', title: 'Algebra', topic: 'Maths' }]],
      [Exam, [{ id: 'e1', title: 'WAEC Biology mock' }, { id: 'e2', title: 'JAMB Biology mock' }]],
      [ExamPrep, [{ userId: 'u1', studyPlan: { examType: 'JAMB' } }]],
      [LearnerAssessment, [{ id: 'a1', userId: 'u1', kind: 'quiz', title: 'My cells quiz' }, { id: 'a2', userId: 'u2', kind: 'quiz', title: 'Someone else’s' }]],
      [AssessmentAttempt, [{ assessmentId: 'a1', userId: 'u1', status: 'submitted', score: 40 }]],
      [LearningResource, [{ id: 'r1', userId: 'u1', kind: 'lesson', title: 'Mitosis', completedAt: null }, { id: 'r2', userId: 'u1', kind: 'lesson', title: 'Done', completedAt: new Date() }]],
      [PersonalCourse, [{ id: 'c1', userId: 'u1', title: 'Biology', archivedAt: null }]],
      [PersonalCourseModule, [{ id: 'm1', courseId: 'c1', userId: 'u1', title: 'Genetics', isCompleted: false }]],
    ]);
    const s = new RecommendationsService(ds(tables, { topics: [{ topics: [{ topic: 'Cells', correct: 1, total: 4 }, { topic: 'Maths', correct: 4, total: 4 }] }], examScores: [{ assessmentId: 'e1', score: '85' }] }));
    const all = await s.all('u1');
    expect(all.topics).toEqual([expect.objectContaining({ title: 'Cells', reason: 'You answered 1 of 4 questions on it correctly (25%).' })]);
    expect(all.quizzes.map((q) => q.id)).toEqual(['q1', 'a1']); // the matching official quiz, then the learner's weak one
    expect(all.quizzes[1].reason).toBe('Your best score is 40%. Try again.');
    expect(all.revision.map((r) => r.id)).toEqual(['r1', 'm1']);
    expect(all.exams.map((e) => e.id)).toEqual(['e2']); // e1 already passed (85%); e2 matches the JAMB plan
    expect(all.exams[0].reason).toMatch(/JAMB preparation/);
  });
});
