import { BadRequestException, ConflictException, INestApplication, Logger, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { AdminContentService } from './admin-content.service.js';
import { AdminContentController } from './admin-content.controller.js';
import { CatalogIntegrityService } from '../../courses/catalog-integrity.service.js';
import { Course } from '../../courses/entities/course.entity.js';
import { Topic } from '../../courses/entities/topic.entity.js';
import { Enrollment } from '../../courses/entities/enrollment.entity.js';
import { LessonEntity } from '../../lessons/entities/lesson.entity.js';
import { LessonProgressEntity } from '../../lessons/entities/lesson-progress.entity.js';
import { TopicMastery } from '../../progress/entities/topic-mastery.entity.js';
import { UserProgress } from '../../progress/entities/user-progress.entity.js';
import { Department } from '../../academic/entities/department.entity.js';
import { AdminJwtStrategy } from '../auth/strategies/admin-jwt.strategy.js';
import { Admin, AdminRole } from '../auth/entity/admin.entity.js';
import { createGlobalValidationPipe } from '../../common/validation/global-validation.pipe.js';

const COURSE = '11111111-aaaa-4aaa-8aaa-111111111111';
const TOPIC = '22222222-aaaa-4aaa-8aaa-222222222222';
const LESSON = '33333333-aaaa-4aaa-8aaa-333333333333';
const DEPT = '44444444-aaaa-4aaa-8aaa-444444444444';

function setup(counts: Partial<Record<string, number>> = {}) {
  const countFor = new Map<unknown, number>([
    [Topic, counts.topics ?? 0],
    [LessonEntity, counts.lessons ?? 0],
    [Enrollment, counts.enrollments ?? 0],
    [LessonProgressEntity, counts.lessonProgress ?? 0],
    [TopicMastery, counts.mastery ?? 0],
    [UserProgress, counts.progress ?? 0],
    [Department, counts.departments ?? 1],
  ]);
  const repos = new Map<unknown, any>();
  const repoFor = (entity: unknown) => {
    if (!repos.has(entity)) {
      repos.set(entity, {
        count: vi.fn(async () => countFor.get(entity) ?? 0),
        update: vi.fn(async () => ({ affected: 1 })),
        findAndCount: vi.fn(async () => [[{ id: COURSE, title: 'Biology' }], 1]),
      });
    }
    return repos.get(entity);
  };
  const courses = {
    findCourseById: vi.fn(async (id: string) => {
      if (id !== COURSE) throw new NotFoundException('Course not found');
      return { id: COURSE, title: 'Biology', topics: [{ id: 't2', order: 2 }, { id: 't1', order: 1 }] };
    }),
    createCourse: vi.fn(async (dto: any) => ({ id: COURSE, ...dto })),
    deleteCourse: vi.fn(async () => ({ message: 'deleted' })),
    createTopic: vi.fn(async (_c: string, dto: any) => ({ id: TOPIC, ...dto })),
    findTopicById: vi.fn(async (id: string) => {
      if (id !== TOPIC) throw new NotFoundException('Topic not found');
      return { id: TOPIC };
    }),
    deleteTopic: vi.fn(async () => ({ message: 'deleted' })),
  };
  const lessons = {
    findLessonsByCourse: vi.fn(async () => [{ id: LESSON, orderIndex: 0 }]),
    findLessonById: vi.fn(async (id: string) => {
      if (id !== LESSON) throw new NotFoundException('Lesson not found');
      return { id: LESSON };
    }),
    createLesson: vi.fn(async (courseId: string, dto: any) => ({ id: LESSON, courseId, ...dto })),
    updateLesson: vi.fn(async (id: string, dto: any) => ({ id, ...dto })),
    removeLesson: vi.fn(async () => ({ status: 'success' })),
  };
  const dataSource = { getRepository: vi.fn(repoFor) };
  const service = new AdminContentService(courses as any, lessons as any, dataSource as any, new CatalogIntegrityService(dataSource as any));
  return { service, courses, lessons, repoFor };
}

describe('AdminContentService (canonical learner catalog)', () => {
  it('lists courses with topic, lesson and enrollment counts and pagination', async () => {
    const { service } = setup({ topics: 3, lessons: 5, enrollments: 2 });
    const res = await service.listCourses({ page: 1, limit: 20, search: '50%_off' });
    expect(res.data.courses[0]).toMatchObject({ id: COURSE, topicCount: 3, lessonCount: 5, enrollmentCount: 2 });
    expect(res.data.pagination).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
  });

  it('course detail includes topics sorted by order and lessons', async () => {
    const { service } = setup();
    const res = await service.getCourse(COURSE);
    expect(res.data.topics.map((t: any) => t.id)).toEqual(['t1', 't2']);
    expect(res.data.lessons).toHaveLength(1);
  });

  it('create/update pass only allowlisted fields to the existing services', async () => {
    const { service, courses, lessons, repoFor } = setup();
    await service.createCourse({ title: 'Bio', track: 'Secondary', id: 'evil', enrollments: [] } as any);
    expect(courses.createCourse).toHaveBeenCalledWith({ title: 'Bio', track: 'Secondary' });
    await service.updateCourse(COURSE, { level: 'SS 2', id: 'evil' } as any);
    expect(repoFor(Course).update).toHaveBeenCalledWith(COURSE, { level: 'SS 2' });
    await service.createLesson(COURSE, { title: 'L1', courseId: 'other', id: 'evil' } as any);
    expect(lessons.createLesson).toHaveBeenCalledWith(COURSE, { title: 'L1' });
  });

  it('rejects empty updates, unknown departments and missing parents', async () => {
    const { service } = setup({ departments: 0 });
    await expect(service.updateCourse(COURSE, {})).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.createCourse({ title: 'Bio', track: 'Secondary', departmentId: DEPT })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.createLesson('55555555-aaaa-4aaa-8aaa-555555555555', { title: 'L' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.getCourse('not-a-uuid')).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each([
    ['enrollments', { enrollments: 1 }],
    ['lessons', { lessons: 1 }],
    ['topics', { topics: 1 }],
  ])('refuses to delete a course that still has %s (409) and deletes nothing', async (_label, counts) => {
    const { service, courses } = setup(counts);
    await expect(service.deleteCourse(COURSE)).rejects.toBeInstanceOf(ConflictException);
    expect(courses.deleteCourse).not.toHaveBeenCalled();
  });

  it('deletes an empty course', async () => {
    const { service, courses } = setup();
    await service.deleteCourse(COURSE);
    expect(courses.deleteCourse).toHaveBeenCalledWith(COURSE);
  });

  it('refuses to delete a topic or lesson with learner progress; deletes them otherwise', async () => {
    const blocked = setup({ mastery: 2, lessonProgress: 1 });
    await expect(blocked.service.deleteTopic(TOPIC)).rejects.toBeInstanceOf(ConflictException);
    await expect(blocked.service.deleteLesson(LESSON)).rejects.toBeInstanceOf(ConflictException);
    expect(blocked.courses.deleteTopic).not.toHaveBeenCalled();
    expect(blocked.lessons.removeLesson).not.toHaveBeenCalled();
    const free = setup();
    await free.service.deleteTopic(TOPIC);
    await free.service.deleteLesson(LESSON);
    expect(free.courses.deleteTopic).toHaveBeenCalledWith(TOPIC);
    expect(free.lessons.removeLesson).toHaveBeenCalledWith(LESSON);
  });
});

describe('HTTP: /api/v1/admin/content requires content.manage and validates input', () => {
  let app: INestApplication;
  const ADMIN_SECRET = 'admin-secret-for-tests-0123456789abcdef-xyz';
  const admins = new Map<string, any>();
  const svc = {
    listCourses: vi.fn(async () => ({ status: 'success', data: { courses: [], pagination: {} } })),
    createCourse: vi.fn(async () => ({ status: 'success' })),
    deleteCourse: vi.fn(async () => ({ status: 'success' })),
  };
  const tokenFor = (role: AdminRole) => {
    const id = `00000000-0000-4000-8000-${String(Object.values(AdminRole).indexOf(role)).padStart(12, '0')}`;
    admins.set(id, { id, role, isActive: true });
    return new JwtService({}).sign({ sub: id, role, type: 'admin' }, { secret: ADMIN_SECRET, expiresIn: '1h' });
  };

  beforeAll(async () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule.register({})],
      controllers: [AdminContentController],
      providers: [
        AdminJwtStrategy,
        { provide: AdminContentService, useValue: svc },
        { provide: ConfigService, useValue: { get: (k: string) => ({ ADMIN_JWT_SECRET: ADMIN_SECRET, JWT_SECRET: 'other-secret-0123456789abcdef0123' } as any)[k] } },
        { provide: getRepositoryToken(Admin), useValue: { findOne: vi.fn(async ({ where }: any) => admins.get(where.id) ?? null) } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(createGlobalValidationPipe());
    await app.init();
  });
  afterAll(async () => app.close());
  beforeEach(() => Object.values(svc).forEach((f) => f.mockClear()));

  const http = () => request(app.getHttpServer());

  it.each([AdminRole.CONTENT_ADMIN, AdminRole.ADMIN, AdminRole.SUPER_ADMIN])('%s can list courses', async (role) => {
    expect((await http().get('/api/v1/admin/content/courses').set('Authorization', `Bearer ${tokenFor(role)}`)).status).toBe(200);
  });

  it.each([AdminRole.ANALYST, AdminRole.SUPPORT_ADMIN, AdminRole.MODERATOR, AdminRole.FINANCE_ADMIN])(
    '%s gets 403 and cannot create or delete',
    async (role) => {
      const auth = { Authorization: `Bearer ${tokenFor(role)}` };
      expect((await http().get('/api/v1/admin/content/courses').set(auth)).status).toBe(403);
      expect((await http().post('/api/v1/admin/content/courses').set(auth).send({ title: 'x', track: 'Secondary' })).status).toBe(403);
      expect((await http().delete(`/api/v1/admin/content/courses/${COURSE}`).set(auth)).status).toBe(403);
      expect(svc.createCourse).not.toHaveBeenCalled();
      expect(svc.deleteCourse).not.toHaveBeenCalled();
    },
  );

  it('rejects an invalid course payload with 400 before the service runs', async () => {
    const auth = { Authorization: `Bearer ${tokenFor(AdminRole.CONTENT_ADMIN)}` };
    const res = await http().post('/api/v1/admin/content/courses').set(auth).send({ title: '', track: '' });
    expect(res.status).toBe(400);
    expect(svc.createCourse).not.toHaveBeenCalled();
    expect((await http().get('/api/v1/admin/content/courses?limit=500').set(auth)).status).toBe(400);
  });

  it('no token → 401', async () => {
    expect((await http().get('/api/v1/admin/content/courses')).status).toBe(401);
  });
});
