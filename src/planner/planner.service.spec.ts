import { NotImplementedException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatePlannerItemDto } from './dto/study-planner.dto.js';
import { PlannerService } from './planner.service.js';

describe('PlannerService', () => {
  function build() {
    const saved: any[] = [];
    const repo = {
      create: vi.fn((d: any) => d),
      save: vi.fn(async (d: any) => {
        saved.push(d);
        return { id: 'p1', ...d };
      }),
    };
    return { service: new PlannerService(repo as never), repo, saved };
  }

  it('adds a session owned by the learner', async () => {
    const { service, saved } = build();
    const res = await service.createItem('u1', { title: '  Revise cells ', scheduledDate: '2026-11-02', startTime: '09:00' } as never);
    expect(saved[0]).toMatchObject({ userId: 'u1', title: 'Revise cells', scheduledDate: '2026-11-02', startTime: '09:00', activityType: 'study' });
    expect(res.item.id).toBe('p1');
  });

  it('"generate" no longer stores fixed sample sessions as an AI plan', async () => {
    const { service, repo } = build();
    await expect(service.generatePlanner('u1', { targetId: 'c', deadline: '2026-12-01' } as never)).rejects.toBeInstanceOf(NotImplementedException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('validates the new session', async () => {
    const errors = async (body: object) => (await validate(plainToInstance(CreatePlannerItemDto, body))).map((e) => e.property);
    expect(await errors({ title: 'T', scheduledDate: '2026-11-02', startTime: '23:59', activityType: 'revision' })).toEqual([]);
    expect(await errors({ title: '', scheduledDate: '02/11/2026', startTime: '9am', activityType: 'party' })).toEqual(['title', 'scheduledDate', 'startTime', 'activityType']);
    expect(await errors({ title: 'x'.repeat(256), scheduledDate: '2026-11-02' })).toEqual(['title']);
  });
});
