import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CalendarService } from './calendar.service.js';

const missing = () => Object.assign(new Error('relation "calendar_events" does not exist'), { code: '42P01' });

function repo(rows: any[] = []) {
  return {
    rows,
    find: vi.fn(async ({ where }: any) => rows.filter((r) => r.userId === where.userId)),
    findOne: vi.fn(async ({ where }: any) => rows.find((r) => r.id === where.id && r.userId === where.userId) ?? null),
    create: vi.fn((x: any) => ({ id: `e${rows.length + 1}`, ...x })),
    save: vi.fn(async (x: any) => (rows.includes(x) ? x : (rows.push(x), x))),
    delete: vi.fn(async ({ id, userId }: any) => {
      const i = rows.findIndex((r) => r.id === id && r.userId === userId);
      if (i >= 0) rows.splice(i, 1);
      return { affected: i >= 0 ? 1 : 0 };
    }),
  };
}

describe('calendar (TypeORM)', () => {
  it('a missing table answers 501, not 500', async () => {
    const r = repo();
    r.find.mockRejectedValue(missing());
    await expect(new CalendarService(r as never).getAllEvents('u1')).rejects.toMatchObject({ status: 501 });
  });

  it('creates, updates and deletes only the learner’s own events; refuses events that end before they start', async () => {
    const r = repo();
    const s = new CalendarService(r as never);
    const e = await s.createEvent('u1', { title: ' Biology revision ', startTime: '2026-11-05T10:00:00Z', endTime: '2026-11-05T11:00:00Z' } as never);
    expect(e).toMatchObject({ userId: 'u1', title: 'Biology revision', isAllDay: false });
    await expect(s.createEvent('u1', { title: 't', startTime: '2026-11-05T10:00:00Z', endTime: '2026-11-05T09:00:00Z' } as never)).rejects.toBeInstanceOf(BadRequestException);
    await expect(s.updateEvent('u2', e.id, { title: 'mine now' } as never)).rejects.toBeInstanceOf(NotFoundException);
    await expect(s.deleteEvent('u2', e.id)).rejects.toBeInstanceOf(NotFoundException);
    expect((await s.updateEvent('u1', e.id, { title: 'Chemistry' } as never)).title).toBe('Chemistry');
    expect(await s.deleteEvent('u1', e.id)).toMatchObject({ id: e.id });
    await expect(s.getMonthEvents('u1', 2026, 13)).rejects.toBeInstanceOf(BadRequestException);
  });
});
