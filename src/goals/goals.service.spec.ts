import { GoalsService } from './goals.service.js';

/** Request bodies are not whitelisted globally: `id`/`userId` must not let a learner overwrite or move another learner's goal. */
describe('GoalsService.update', () => {
  it('ignores id and userId in the body', async () => {
    const goal = { id: 'g1', userId: 'u1', title: 'Old', targetValue: 10, currentValue: 0 };
    const repo = { findOne: vi.fn(async () => ({ ...goal })), save: vi.fn(async (g: any) => g) };
    const service = new GoalsService(repo as never);
    const res = await service.update('u1', 'g1', { title: 'New', id: 'someone-elses-goal', userId: 'u2' } as never);
    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'g1', userId: 'u1' } });
    expect(res.goal).toMatchObject({ id: 'g1', userId: 'u1', title: 'New' });
  });
});

describe('GoalsService.update — progress', () => {
  const make = (over: object = {}) => {
    const goal = { id: 'g1', userId: 'u1', title: 'Study hours', targetValue: 10, currentValue: 0, isCompleted: false, ...over };
    const repo = { findOne: vi.fn(async () => ({ ...goal })), save: vi.fn(async (g: any) => g) };
    return new GoalsService(repo as never);
  };

  it('records progress, kept within the target; reaching the target completes the goal, lowering it reopens it', async () => {
    expect((await make().update('u1', 'g1', { currentValue: 6 })).goal).toMatchObject({ currentValue: 6, isCompleted: false });
    expect((await make().update('u1', 'g1', { currentValue: 25 })).goal).toMatchObject({ currentValue: 10, isCompleted: true });
    expect((await make({ currentValue: 10, isCompleted: true }).update('u1', 'g1', { currentValue: 4 })).goal).toMatchObject({ currentValue: 4, isCompleted: false });
    expect((await make({ currentValue: 8 }).update('u1', 'g1', { targetValue: 5 })).goal).toMatchObject({ targetValue: 5, currentValue: 5, isCompleted: true });
  });

  it('refuses a target of 0 or less; a title-only edit leaves progress alone', async () => {
    await expect(make().update('u1', 'g1', { targetValue: 0 })).rejects.toMatchObject({ status: 400 });
    expect((await make({ currentValue: 3 }).update('u1', 'g1', { title: 'Renamed' })).goal).toMatchObject({ title: 'Renamed', currentValue: 3, isCompleted: false });
  });
});
