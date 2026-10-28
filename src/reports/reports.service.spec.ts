import { BadRequestException } from '@nestjs/common';
import { ReportsService } from './reports.service.js';
import { ReportType } from './dto/create-report.dto.js';

const missing = (t: string) => Object.assign(new Error(`relation "${t}" does not exist`), { code: '42P01' });

function repo() {
  const rows: any[] = [];
  return {
    rows,
    create: vi.fn((x: any) => ({ ...x })),
    save: vi.fn(async (x: any) => {
      const row = { id: `r${rows.length + 1}`, createdAt: new Date('2026-10-29T10:00:00Z'), ...x };
      rows.push(row);
      return row;
    }),
    find: vi.fn(async ({ where }: any) => rows.filter((r) => r.reporterId === where.reporterId)),
  };
}

describe('reports and feedback (TypeORM)', () => {
  it('reports are stored for moderators in admin_reports and listed only for their reporter', async () => {
    const reports = repo();
    const s = new ReportsService(reports as never, repo() as never);
    const general = await s.createReport({ type: ReportType.OTHER, reason: ' Something is broken ', details: ' The timer froze ' }, 'u1');
    expect(reports.rows[0]).toMatchObject({ reporterId: 'u1', reportedItemType: 'GENERAL', reportedItemId: '', reason: '[OTHER] Something is broken', description: 'The timer froze', status: 'PENDING' });
    expect(general).toMatchObject({ type: 'OTHER', target: 'GENERAL', targetId: null, reason: 'Something is broken', details: 'The timer froze', status: 'PENDING' });

    const q = await s.reportTarget('QUESTION', 'q-42', { type: ReportType.INAPPROPRIATE, reason: 'Wrong answer key' }, 'u1');
    expect(q).toMatchObject({ type: 'INAPPROPRIATE', target: 'QUESTION', targetId: 'q-42', details: null });

    await s.createReport({ type: ReportType.SPAM, reason: 'x' }, 'u2');
    expect((await s.getUserReports('u1')).map((r) => r.id)).toEqual(['r1', 'r2']);
  });

  it('refuses blank reasons and bad ids; a missing table answers 501', async () => {
    const reports = repo();
    const s = new ReportsService(reports as never, repo() as never);
    await expect(s.createReport({ type: ReportType.OTHER, reason: '   ' }, 'u1')).rejects.toBeInstanceOf(BadRequestException);
    await expect(s.reportTarget('CONTENT', ' ', { type: ReportType.OTHER, reason: 'r' }, 'u1')).rejects.toBeInstanceOf(BadRequestException);
    reports.find.mockRejectedValue(missing('admin_reports'));
    await expect(s.getUserReports('u1')).rejects.toMatchObject({ status: 501 });
  });

  it('feedback is stored with its rating; blank messages are refused; a missing table answers 501', async () => {
    const feedback = repo();
    const s = new ReportsService(repo() as never, feedback as never);
    expect(await s.submitFeedback({ rating: 4, message: ' Love the visual lessons ' }, 'u1')).toMatchObject({ rating: 4, message: 'Love the visual lessons' });
    expect(feedback.rows[0]).toMatchObject({ userId: 'u1', rating: 4 });
    await expect(s.submitFeedback({ rating: 4, message: '  ' }, 'u1')).rejects.toBeInstanceOf(BadRequestException);
    feedback.save.mockRejectedValue(missing('learner_feedback'));
    await expect(s.submitFeedback({ rating: 5, message: 'ok' }, 'u1')).rejects.toMatchObject({ status: 501 });
  });
});
