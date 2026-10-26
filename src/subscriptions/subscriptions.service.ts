// src/subscriptions/subscriptions.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { prismaModel } from '../common/prisma/prisma-model.js';
import { featureUnavailable } from '../common/errors/feature-unavailable.js';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  private model(name: string) {
    return prismaModel(this.prisma, name, 'Subscriptions');
  }

  async getPlans() {
    return this.model('subscriptionPlan').findMany({
      where: { isActive: true },
    });
  }

  async getCurrentSubscription(userId: string) {
    const sub = await this.model('userSubscription').findFirst({
      where: { userId, status: 'ACTIVE' },
      include: { plan: true },
    });
    if (!sub) return { message: 'No active subscription found.', active: false };
    return { active: true, subscription: sub };
  }

  async cancelSubscription(userId: string) {
    return this.model('userSubscription').updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'CANCELLED' },
    });
  }

  async getSubscriptionHistory(userId: string) {
    return this.model('userSubscription').findMany({
      where: { userId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /*
   * Paid access is only granted after a VERIFIED payment, and no payment provider is integrated yet.
   * These operations used to grant an ACTIVE subscription without any payment (subscribe/upgrade), report every
   * reference as paid (verify) and return a fake checkout URL (initialize). They now refuse with 501 and change no
   * data. Re-enable them only together with a real provider: server-side verification of the amount, currency and
   * reference with the provider, and a signature-checked webhook.
   */
  private paymentsUnavailable(action: string) {
    return featureUnavailable(action, 'payments are not integrated, so a plan cannot be granted without a verified payment');
  }

  async subscribe(): Promise<never> {
    throw this.paymentsUnavailable('Subscribing to a plan');
  }

  async upgradeSubscription(): Promise<never> {
    throw this.paymentsUnavailable('Upgrading a subscription');
  }

  async initializePayment(): Promise<never> {
    throw this.paymentsUnavailable('Starting a payment');
  }

  async verifyPayment(): Promise<never> {
    throw this.paymentsUnavailable('Verifying a payment');
  }

  async handleWebhook(): Promise<never> {
    throw this.paymentsUnavailable('Payment webhooks');
  }
}
