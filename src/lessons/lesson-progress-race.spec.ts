import { LessonsService } from './lessons.service.js';

/** Opening a lesson and "Mark as complete" at the same moment both inserted a progress row: the second got a 500. */
describe('lesson progress when start and complete race', () => {
  it('a unique violation is resolved by updating the row the other request created', async () => {
    const existing = { id: 'p1', lessonId: 'l1', userId: 'u1', startedAt: new Date(), isCompleted: false };
    let calls = 0;
    const repo = {
      findOne: vi.fn(async () => (calls === 0 ? null : { ...existing })),
      create: vi.fn((d: any) => d),
      save: vi.fn(async (p: any) => {
        if (calls++ === 0) throw Object.assign(new Error('duplicate key'), { driverError: { code: '23505' } });
        return p;
      }),
    };
    const service = new LessonsService({ findOne: vi.fn(async () => ({ id: 'l1' })) } as never, repo as never);
    vi.spyOn(service, 'findLessonById').mockResolvedValue({ id: 'l1' } as never);
    const res: any = await service.completeLesson('l1', 'u1');
    expect(res).toMatchObject({ id: 'p1', isCompleted: true });
    expect(repo.save).toHaveBeenCalledTimes(2);
  });

  it('other database errors are not swallowed', async () => {
    const repo = { findOne: vi.fn(async () => null), create: (d: any) => d, save: vi.fn(async () => Promise.reject(new Error('db down'))) };
    const service = new LessonsService({} as never, repo as never);
    vi.spyOn(service, 'findLessonById').mockResolvedValue({ id: 'l1' } as never);
    await expect(service.startLesson('l1', 'u1')).rejects.toThrow('db down');
  });
});
