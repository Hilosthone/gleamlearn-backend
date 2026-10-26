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
