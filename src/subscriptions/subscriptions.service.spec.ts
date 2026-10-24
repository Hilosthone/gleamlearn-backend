import { NotImplementedException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service.js';
import { SubscriptionsController } from './subscriptions.controller.js';

/** Every Prisma call is recorded, so the tests can prove that refused operations touch no data. */
function recordingPrisma() {
  const calls: string[] = [];
  const model = (name: string) =>
    new Proxy({}, { get: (_t, op: string) => vi.fn(async () => { calls.push(`${name}.${op}`); return []; }) });
  return { calls, prisma: { subscriptionPlan: model('subscriptionPlan'), userSubscription: model('userSubscription') } };
}

describe('SubscriptionsService: no paid access without a verified payment', () => {
  const blocked = ['subscribe', 'upgradeSubscription', 'initializePayment', 'verifyPayment', 'handleWebhook'] as const;

  it.each(blocked)('%s refuses with 501 and changes no data', async (method) => {
    const { calls, prisma } = recordingPrisma();
    const service = new SubscriptionsService(prisma as never);
    await expect((service[method] as () => Promise<never>)()).rejects.toBeInstanceOf(NotImplementedException);
    expect(calls).toEqual([]);
  });

  it('the refusal says why and never claims success', async () => {
    const service = new SubscriptionsService(recordingPrisma().prisma as never);
    const err = await service.verifyPayment().catch((e: NotImplementedException) => e);
    expect(err.getStatus()).toBe(501);
    expect(err.message).toMatch(/payments are not integrated/);
    expect(JSON.stringify(err.getResponse())).not.toMatch(/SUCCESS|checkout/i);
  });

  it('cancelling and reading are unchanged (they never grant access)', async () => {
    const { calls, prisma } = recordingPrisma();
    const service = new SubscriptionsService(prisma as never);
    await service.cancelSubscription('u1');
    await service.getSubscriptionHistory('u1');
    expect(calls).toEqual(['userSubscription.updateMany', 'userSubscription.findMany']);
  });

  it('the controller routes reach the refusal (no request data is used)', async () => {
    const service = new SubscriptionsService(recordingPrisma().prisma as never);
    const controller = new SubscriptionsController(service);
    for (const route of ['subscribe', 'upgradeSubscription', 'initializePayment', 'verifyPayment', 'handleWebhook'] as const) {
      await expect((controller[route] as () => Promise<unknown>)()).rejects.toBeInstanceOf(NotImplementedException);
    }
  });
});
