import { NotImplementedException } from '@nestjs/common';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service.js';
import { prismaModel } from './prisma-model.js';

/** These Prisma models have no tables: the routes answered 500 ("Cannot read properties of undefined"). */
describe('services on missing Prisma models answer 501 FEATURE_UNAVAILABLE', () => {
  const empty = {} as never; // the real PrismaService has none of these models

  const expect501 = async (p: Promise<unknown>, feature: string) => {
    const err = await p.then(() => null, (e) => e);
    expect(err).toBeInstanceOf(NotImplementedException);
    expect(err.getResponse()).toMatchObject({ statusCode: 501, code: 'FEATURE_UNAVAILABLE', feature });
  };

  // the calendar, reports/feedback and usage moved to TypeORM (calendar.service.spec.ts, reports.service.spec.ts,
  // usage.service.spec.ts)

  it('subscription plans, status and history', async () => {
    const s = new SubscriptionsService(empty);
    await expect501(s.getPlans(), 'Subscriptions');
    await expect501(s.getCurrentSubscription('u'), 'Subscriptions');
    await expect501(s.getSubscriptionHistory('u'), 'Subscriptions');
  });

  it('a model that exists is used as before', async () => {
    const plan = { findMany: vi.fn(async () => [{ id: 'p1' }]) };
    expect(prismaModel({ subscriptionPlan: plan }, 'subscriptionPlan', 'x')).toBe(plan);
    expect(prismaModel({ a: 1 }, 'a', 'x')).toBe(1);
  });
});
