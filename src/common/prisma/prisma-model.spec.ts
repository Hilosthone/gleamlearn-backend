import { NotImplementedException } from '@nestjs/common';
import { CalendarService } from '../../calendar/calendar.service.js';
import { ReportsService } from '../../reports/reports.service.js';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service.js';
import { UsageService } from '../../usage/usage.service.js';
import { prismaModel } from './prisma-model.js';

/** These Prisma models have no tables: the routes answered 500 ("Cannot read properties of undefined"). */
describe('services on missing Prisma models answer 501 FEATURE_UNAVAILABLE', () => {
  const empty = {} as never; // the real PrismaService has none of these models

  const expect501 = async (p: Promise<unknown>, feature: string) => {
    const err = await p.then(() => null, (e) => e);
    expect(err).toBeInstanceOf(NotImplementedException);
    expect(err.getResponse()).toMatchObject({ statusCode: 501, code: 'FEATURE_UNAVAILABLE', feature });
  };

  it('calendar', async () => {
    const s = new CalendarService(empty);
    await expect501(s.getAllEvents('u'), 'Calendar');
    await expect501(s.createEvent('u', { title: 't' } as never), 'Calendar');
  });

  it('reports and feedback', async () => {
    const s = new ReportsService(empty);
    await expect501(s.getUserReports('u'), 'Reports and feedback');
    await expect501(s.submitFeedback({ message: 'm' } as never, 'u'), 'Reports and feedback');
    await expect501(s.reportTarget('QUESTION', 'q', { type: 'x', reason: 'y' } as never, 'u'), 'Reports and feedback');
  });

  it('subscription plans, status and history', async () => {
    const s = new SubscriptionsService(empty);
    await expect501(s.getPlans(), 'Subscriptions');
    await expect501(s.getCurrentSubscription('u'), 'Subscriptions');
    await expect501(s.getSubscriptionHistory('u'), 'Subscriptions');
  });

  it('usage limits', async () => {
    await expect501(new UsageService(empty).getUsageOverview('u'), 'Usage limits');
  });

  it('a model that exists is used as before', async () => {
    const report = { findMany: vi.fn(async () => [{ id: 'r1' }]) };
    await expect(new ReportsService({ report } as never).getUserReports('u')).resolves.toEqual([{ id: 'r1' }]);
    expect(report.findMany).toHaveBeenCalledWith({ where: { userId: 'u' }, orderBy: { createdAt: 'desc' } });
    expect(prismaModel({ a: 1 }, 'a', 'x')).toBe(1);
  });
});
