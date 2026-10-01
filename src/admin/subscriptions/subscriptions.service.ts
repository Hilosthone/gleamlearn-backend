import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminSubscription } from './entities/admin-subscription.entity.js';
import { SubscriptionQueryDto } from './dto/subscription-query.dto.js';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto.js';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(AdminSubscription)
    private readonly subscriptionRepo: Repository<AdminSubscription>,
  ) {}

  async findAll(query: SubscriptionQueryDto) {
    const { page = 1, limit = 10, status } = query;
    const where: any = {};
    if (status) where.status = status;

    const [subscriptions, total] = await this.subscriptionRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      status: 'success',
      data: {
        subscriptions,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    };
  }

  async findOne(id: string) {
    const subscription = await this.subscriptionRepo.findOne({ where: { id } });
    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }
    return { status: 'success', data: subscription };
  }

  async update(id: string, dto: UpdateSubscriptionDto) {
    const subscription = (await this.findOne(id)).data;
    Object.assign(subscription, dto);
    const updated = await this.subscriptionRepo.save(subscription);
    return { status: 'success', message: 'Subscription updated successfully', data: updated };
  }

  async cancel(id: string) {
    const subscription = (await this.findOne(id)).data;
    subscription.status = 'CANCELLED';
    const updated = await this.subscriptionRepo.save(subscription);
    return { status: 'success', message: 'Subscription cancelled successfully', data: updated };
  }

  async refund(id: string) {
    const subscription = (await this.findOne(id)).data;
    subscription.status = 'EXPIRED'; // Or mark as refunded depending on business logic
    await this.subscriptionRepo.save(subscription);
    return { status: 'success', message: `Subscription ${id} refunded and revoked successfully` };
  }
}