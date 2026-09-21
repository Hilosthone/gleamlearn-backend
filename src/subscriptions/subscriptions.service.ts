// src/subscriptions/subscriptions.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { SubscribeDto } from './dto/subscribe.dto.js';
import { InitializePaymentDto } from './dto/initialize-payment.dto.js';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlans() {
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
    });
  }

  async getCurrentSubscription(userId: string) {
    const sub = await this.prisma.userSubscription.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: { plan: true },
    });
    if (!sub) return { message: 'No active subscription found.', active: false };
    return { active: true, subscription: sub };
  }

  async subscribe(dto: SubscribeDto, userId: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan) throw new NotFoundException('Subscription plan not found.');

    // Deactivate existing active subscriptions
    await this.prisma.userSubscription.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'CANCELLED' },
    });

    return this.prisma.userSubscription.create({
      data: {
        userId,
        planId: dto.planId,
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
      },
    });
  }

  async cancelSubscription(userId: string) {
    return this.prisma.userSubscription.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'CANCELLED' },
    });
  }

  async upgradeSubscription(dto: SubscribeDto, userId: string) {
    return this.subscribe(dto, userId); // Re-uses subscribe logic to switch active plan
  }

  async getSubscriptionHistory(userId: string) {
    return this.prisma.userSubscription.findMany({
      where: { userId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async initializePayment(dto: InitializePaymentDto, user: any) {
    // Placeholder for payment gateway integration (e.g. Paystack API call)
    return {
      authorizationUrl: 'https://checkout.paystack.com/placeholder-url',
      reference: `txn_${Date.now()}_${user.id}`,
      amount: dto.amount,
    };
  }

  async verifyPayment(reference: string, userId: string) {
    // Placeholder for payment verification logic
    return {
      reference,
      status: 'SUCCESS',
      message: 'Payment verified successfully.',
    };
  }

  async handleWebhook(eventPayload: any) {
    // Handle background webhook notifications from payment providers
    return { received: true, event: eventPayload?.event };
  }
}