import { CoursesService } from './courses.service.js';

function build() {
  const courseRepo = { find: vi.fn(async () => []) };
  const service = Object.create(CoursesService.prototype);
  service.courseRepo = courseRepo;
  return { service: service as CoursesService, courseRepo };
}

const whereOf = (repo: { find: ReturnType<typeof vi.fn> }) => (repo.find.mock.calls[0] as any)[0].where as Array<Record<string, any>>;

describe('GET /courses/search (CoursesService.searchCourses)', () => {
  it('omits filters that were not given (they caused a 500 before)', async () => {
    const { service, courseRepo } = build();
    await service.searchCourses('bio');
    for (const clause of whereOf(courseRepo)) {
      expect(Object.keys(clause).sort()).toEqual(expect.arrayContaining([expect.stringMatching(/title|description/)]));
      expect(clause).not.toHaveProperty('track');
      expect(clause).not.toHaveProperty('level');
    }
  });

  it('applies track and level when given', async () => {
    const { service, courseRepo } = build();
    await service.searchCourses('bio', 'University', '100L');
    for (const clause of whereOf(courseRepo)) expect(clause).toMatchObject({ track: 'University', level: '100L' });
  });

  it('escapes LIKE wildcards so they match literally', async () => {
    const { service, courseRepo } = build();
    await service.searchCourses('50%_off\\x');
    const title = whereOf(courseRepo)[0].title;
    expect(title.value).toBe('%50\\%\\_off\\\\x%');
  });
});

describe('GET /users/me/courses progress (computed from completed lessons)', () => {
  function withManager(total: number, completed: number) {
    const qb: any = { innerJoin: () => qb, where: () => qb, andWhere: () => qb, getCount: vi.fn(async () => completed) };
    const manager = { count: vi.fn(async () => total), createQueryBuilder: vi.fn(() => qb) };
    const enrollmentRepo = {
      manager,
      find: vi.fn(async () => [{ courseId: 'c1', progressPercentage: 0, enrolledAt: 'd', course: { id: 'c1', title: 'Bio' } }]),
    };
    const service = Object.create(CoursesService.prototype);
    service.enrollmentRepo = enrollmentRepo;
    return service as CoursesService;
  }

  it('1 of 3 lessons completed → 33%', async () => {
    const [course] = await withManager(3, 1).findUserEnrolledCourses('u1');
    expect(course).toMatchObject({ id: 'c1', progressPercentage: 33, enrolledAt: 'd' });
  });

  it('a course without lessons keeps the stored value (0)', async () => {
    const [course] = await withManager(0, 0).findUserEnrolledCourses('u1');
    expect(course.progressPercentage).toBe(0);
  });
});
