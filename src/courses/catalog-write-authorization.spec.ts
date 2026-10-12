import { INestApplication, Logger, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { CoursesController } from './courses.controller.js';
import { CoursesService } from './courses.service.js';
import { CatalogIntegrityService } from './catalog-integrity.service.js';
import { Topic } from './entities/topic.entity.js';
import { Enrollment } from './entities/enrollment.entity.js';
import { Course } from './entities/course.entity.js';
import { LessonsController } from '../lessons/lessons.controller.js';
import { LessonsService } from '../lessons/lessons.service.js';
import { LessonEntity } from '../lessons/entities/lesson.entity.js';
import { LessonProgressEntity } from '../lessons/entities/lesson-progress.entity.js';
import { TopicMastery } from '../progress/entities/topic-mastery.entity.js';
import { UserProgress } from '../progress/entities/user-progress.entity.js';
import { AcademicController } from '../academic/academic.controller.js';
import { AcademicService } from '../academic/academic.service.js';
import { Faculty } from '../academic/entities/faculty.entity.js';
import { Department } from '../academic/entities/department.entity.js';
import { JwtStrategy } from '../auth/strategies/jwt.strategy.js';
import { AccountStatusService } from '../auth/account-status.service.js';
import { User } from '../auth/entities/user.entity.js';
import { AdminJwtStrategy } from '../admin/auth/strategies/admin-jwt.strategy.js';
import { Admin, AdminRole } from '../admin/auth/entity/admin.entity.js';
import { createGlobalValidationPipe } from '../common/validation/global-validation.pipe.js';

const LEARNER_SECRET = 'learner-secret-for-tests-0123456789abcdef';
const ADMIN_SECRET = 'admin-secret-for-tests-0123456789abcdef-xyz';
const LEARNER_ID = '88888888-8888-4888-8888-888888888888';
const COURSE = '11111111-aaaa-4aaa-8aaa-111111111111';
const TOPIC = '22222222-aaaa-4aaa-8aaa-222222222222';
const LESSON = '33333333-aaaa-4aaa-8aaa-333333333333';
const INSTITUTION = '44444444-aaaa-4aaa-8aaa-444444444444';
const FACULTY = '55555555-aaaa-4aaa-8aaa-555555555555';
const DEPARTMENT = '66666666-aaaa-4aaa-8aaa-666666666666';

/** Every platform-content mutation outside /admin. All must be admin-only (content.manage). */
const WRITE_ROUTES: Array<['post' | 'patch' | 'delete', string, object | undefined]> = [
  ['post', '/api/v1/courses', { title: 'Bio', track: 'Secondary' }],
  ['patch', `/api/v1/courses/${COURSE}`, { title: 'Bio 2', track: 'Secondary' }],
  ['delete', `/api/v1/courses/${COURSE}`, undefined],
  ['post', `/api/v1/courses/${COURSE}/topics`, { title: 'Cells' }],
  ['patch', `/api/v1/topics/${TOPIC}`, { title: 'Cells 2' }],
  ['delete', `/api/v1/topics/${TOPIC}`, undefined],
  ['post', `/api/v1/courses/${COURSE}/lessons`, { title: 'L1' }],
  ['patch', `/api/v1/lessons/${LESSON}`, { title: 'L2' }],
  ['delete', `/api/v1/lessons/${LESSON}`, undefined],
  ['post', '/api/v1/institutions', { name: 'Uni', type: 'University' }],
  ['patch', `/api/v1/institutions/${INSTITUTION}`, { name: 'Uni 2', type: 'University' }],
  ['delete', `/api/v1/institutions/${INSTITUTION}`, undefined],
  ['post', '/api/v1/faculties', { name: 'Science', institutionId: INSTITUTION }],
  ['patch', `/api/v1/faculties/${FACULTY}`, { name: 'Sci', institutionId: INSTITUTION }],
  ['delete', `/api/v1/faculties/${FACULTY}`, undefined],
  ['post', '/api/v1/departments', { name: 'CS', facultyId: FACULTY }],
  ['patch', `/api/v1/departments/${DEPARTMENT}`, { name: 'CSE', facultyId: FACULTY }],
  ['delete', `/api/v1/departments/${DEPARTMENT}`, undefined],
];

/** Learner routes on the same controllers that must keep working with a learner token. */
const LEARNER_ROUTES: Array<['get' | 'post' | 'delete', string]> = [
  ['get', '/api/v1/courses'],
  ['get', '/api/v1/courses/search?q=bio'],
  ['get', `/api/v1/courses/${COURSE}`],
  ['get', `/api/v1/courses/${COURSE}/topics`],
  ['get', `/api/v1/topics/${TOPIC}`],
  ['get', '/api/v1/users/me/courses'],
  ['post', `/api/v1/courses/${COURSE}/enroll`],
  ['delete', `/api/v1/courses/${COURSE}/enroll`],
  ['get', `/api/v1/courses/${COURSE}/lessons`],
  ['get', `/api/v1/lessons/${LESSON}`],
  ['post', `/api/v1/lessons/${LESSON}/start`],
  ['post', `/api/v1/lessons/${LESSON}/complete`],
  ['get', `/api/v1/lessons/${LESSON}/progress`],
  ['get', '/api/v1/institutions'],
  ['get', '/api/v1/faculties'],
  ['get', '/api/v1/departments'],
];

const ok = (label: string) => vi.fn(async (...args: unknown[]) => ({ ok: label, args }));

describe('platform content mutations are admin-only (content.manage); learner reads unchanged', () => {
  let app: INestApplication;
  const admins = new Map<string, any>();
  const counts = new Map<unknown, number>();

  const courses = {
    searchCourses: ok('search'),
    findUserEnrolledCourses: ok('mine'),
    findAllCourses: ok('all'),
    createCourse: ok('createCourse'),
    findCourseById: vi.fn(async (id: string) => {
      if (id !== COURSE) throw new NotFoundException('Course not found');
      return { id };
    }),
    updateCourse: ok('updateCourse'),
    deleteCourse: ok('deleteCourse'),
    findTopicsByCourse: ok('topics'),
    createTopic: ok('createTopic'),
    findTopicById: vi.fn(async (id: string) => ({ id })),
    updateTopic: ok('updateTopic'),
    deleteTopic: ok('deleteTopic'),
    enrollUser: ok('enroll'),
    unenrollUser: ok('unenroll'),
  };
  const lessons = {
    findLessonsByCourse: ok('lessons'),
    createLesson: ok('createLesson'),
    findLessonById: vi.fn(async (id: string) => ({ id })),
    updateLesson: ok('updateLesson'),
    removeLesson: ok('removeLesson'),
    startLesson: ok('start'),
    completeLesson: ok('complete'),
    getLessonProgress: ok('progress'),
  };
  const academic = {
    findAllInstitutions: ok('institutions'),
    createInstitution: ok('createInstitution'),
    updateInstitution: ok('updateInstitution'),
    removeInstitution: ok('removeInstitution'),
    findAllFaculties: ok('faculties'),
    createFaculty: ok('createFaculty'),
    updateFaculty: ok('updateFaculty'),
    removeFaculty: ok('removeFaculty'),
    findAllDepartments: ok('departments'),
    createDepartment: ok('createDepartment'),
    updateDepartment: ok('updateDepartment'),
    removeDepartment: ok('removeDepartment'),
  };
  const dataSource = { getRepository: (entity: unknown) => ({ count: vi.fn(async () => counts.get(entity) ?? 0) }) };

  const learnerToken = new JwtService({}).sign({ sub: LEARNER_ID, type: 'learner' }, { secret: LEARNER_SECRET, expiresIn: '1h' });
  const adminToken = (role: AdminRole) => {
    const id = `00000000-0000-4000-8000-${String(Object.values(AdminRole).indexOf(role)).padStart(12, '0')}`;
    admins.set(id, { id, role, isActive: true });
    return new JwtService({}).sign({ sub: id, role, type: 'admin' }, { secret: ADMIN_SECRET, expiresIn: '1h' });
  };

  beforeAll(async () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule.register({})],
      controllers: [CoursesController, LessonsController, AcademicController],
      providers: [
        JwtStrategy,
        AdminJwtStrategy,
        { provide: CoursesService, useValue: courses },
        { provide: LessonsService, useValue: lessons },
        { provide: AcademicService, useValue: academic },
        { provide: CatalogIntegrityService, useFactory: () => new CatalogIntegrityService(dataSource as any) },
        {
          provide: AccountStatusService,
          useValue: { getStatus: vi.fn(async () => ({ exists: true, restricted: false, restrictionReason: null, frozen: false, deleted: false, role: 'student' })) },
        },
        {
          provide: ConfigService,
          useValue: { get: (k: string) => ({ JWT_SECRET: LEARNER_SECRET, ADMIN_JWT_SECRET: ADMIN_SECRET } as Record<string, string>)[k] },
        },
        { provide: getRepositoryToken(User), useValue: { findOne: vi.fn(async () => ({ id: LEARNER_ID, email: 'learner@example.test' })) } },
        { provide: getRepositoryToken(Admin), useValue: { findOne: vi.fn(async ({ where }: any) => admins.get(where.id) ?? null) } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(createGlobalValidationPipe());
    await app.init();
  });
  afterAll(async () => app.close());
  beforeEach(() => {
    counts.clear();
    for (const svc of [courses, lessons, academic]) Object.values(svc).forEach((f) => f.mockClear());
  });

  const send = (method: string, path: string, body: object | undefined, token?: string) => {
    let req = (request(app.getHttpServer()) as any)[method](path);
    if (token) req = req.set('Authorization', `Bearer ${token}`);
    return body ? req.send(body) : req;
  };
  const writeServiceCalls = () =>
    [courses.createCourse, courses.updateCourse, courses.deleteCourse, courses.createTopic, courses.updateTopic, courses.deleteTopic,
      lessons.createLesson, lessons.updateLesson, lessons.removeLesson,
      ...Object.entries(academic).filter(([k]) => !k.startsWith('findAll')).map(([, f]) => f)]
      .reduce((n, f) => n + f.mock.calls.length, 0);

  it.each(WRITE_ROUTES)('%s %s without a token → 401', async (method, path, body) => {
    expect((await send(method, path, body)).status).toBe(401);
    expect(writeServiceCalls()).toBe(0);
  });

  it.each(WRITE_ROUTES)('%s %s with a LEARNER token → 401 (admin token required), nothing changes', async (method, path, body) => {
    expect((await send(method, path, body, learnerToken)).status).toBe(401);
    expect(writeServiceCalls()).toBe(0);
  });

  it.each(WRITE_ROUTES)('%s %s with an admin lacking content.manage (Analyst) → 403', async (method, path, body) => {
    const res = await send(method, path, body, adminToken(AdminRole.ANALYST));
    expect(res.status).toBe(403);
    expect(writeServiceCalls()).toBe(0);
  });

  it.each(WRITE_ROUTES)('%s %s with a Content Admin → 2xx', async (method, path, body) => {
    const res = await send(method, path, body, adminToken(AdminRole.CONTENT_ADMIN));
    expect(res.status).toBeLessThan(300);
    expect(writeServiceCalls()).toBe(1);
  });

  it.each(LEARNER_ROUTES)('learner route %s %s still works with a learner token', async (method, path) => {
    expect((await send(method, path, undefined, learnerToken)).status).toBeLessThan(300);
  });

  it.each(LEARNER_ROUTES)('learner route %s %s still requires authentication', async (method, path) => {
    expect((await send(method, path, undefined)).status).toBe(401);
  });

  it('enrollment and progress use the learner id from the token', async () => {
    await send('post', `/api/v1/courses/${COURSE}/enroll`, undefined, learnerToken);
    expect(courses.enrollUser).toHaveBeenCalledWith(LEARNER_ID, COURSE);
    await send('post', `/api/v1/lessons/${LESSON}/complete`, undefined, learnerToken);
    expect(lessons.completeLesson).toHaveBeenCalledWith(LESSON, LEARNER_ID);
  });

  it('protected fields in write bodies are dropped (no id / courseId mass assignment)', async () => {
    const auth = adminToken(AdminRole.CONTENT_ADMIN);
    await send('post', '/api/v1/courses', { title: 'Bio', track: 'Secondary', id: 'evil', enrollments: [] }, auth);
    expect(courses.createCourse).toHaveBeenCalledWith({ title: 'Bio', track: 'Secondary' });
    await send('post', `/api/v1/courses/${COURSE}/lessons`, { title: 'L1', courseId: 'other', id: 'evil' }, auth);
    expect(lessons.createLesson).toHaveBeenCalledWith(COURSE, { title: 'L1' });
    await send('patch', `/api/v1/topics/${TOPIC}`, { title: 'T', courseId: 'other' }, auth);
    expect(courses.updateTopic).toHaveBeenCalledWith(TOPIC, { title: 'T' });
  });

  it('creating a lesson for a missing course → 404 and nothing is created', async () => {
    const res = await send('post', '/api/v1/courses/99999999-aaaa-4aaa-8aaa-999999999999/lessons', { title: 'L' }, adminToken(AdminRole.CONTENT_ADMIN));
    expect(res.status).toBe(404);
    expect(lessons.createLesson).not.toHaveBeenCalled();
  });

  it.each([
    ['course with enrollments', `/api/v1/courses/${COURSE}`, Enrollment, () => courses.deleteCourse],
    ['course with lessons', `/api/v1/courses/${COURSE}`, LessonEntity, () => courses.deleteCourse],
    ['course with topics', `/api/v1/courses/${COURSE}`, Topic, () => courses.deleteCourse],
    ['topic with mastery records', `/api/v1/topics/${TOPIC}`, TopicMastery, () => courses.deleteTopic],
    ['topic with progress records', `/api/v1/topics/${TOPIC}`, UserProgress, () => courses.deleteTopic],
    ['lesson with progress', `/api/v1/lessons/${LESSON}`, LessonProgressEntity, () => lessons.removeLesson],
    ['institution with faculties', `/api/v1/institutions/${INSTITUTION}`, Faculty, () => academic.removeInstitution],
    ['faculty with departments', `/api/v1/faculties/${FACULTY}`, Department, () => academic.removeFaculty],
    ['department with linked courses', `/api/v1/departments/${DEPARTMENT}`, Course, () => academic.removeDepartment],
  ] as const)('deleting a %s → 409 and nothing is deleted', async (_label, path, entity, fn) => {
    counts.set(entity, 2);
    const res = await send('delete', path, undefined, adminToken(AdminRole.SUPER_ADMIN));
    expect(res.status).toBe(409);
    expect(fn()).not.toHaveBeenCalled();
  });
});
