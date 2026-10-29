import { featureUnavailable } from '../../common/errors/feature-unavailable.js';
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

  async update(_id: string, _dto: UpdateSubscriptionDto): Promise<never> {
    throw featureUnavailable('Subscription changes', 'there is no live subscription or payment provider, so nothing would actually change, be cancelled or be refunded');
  }

  async cancel(_id: string): Promise<never> {
    throw featureUnavailable('Subscription cancellation', 'there is no live subscription or payment provider, so nothing would actually change, be cancelled or be refunded');
  }

  async refund(_id: string): Promise<never> {
    // it used to mark the record "EXPIRED" and answer "refunded" without any payment taking place
    throw featureUnavailable('Refunds', 'there is no live subscription or payment provider, so nothing would actually change, be cancelled or be refunded');
  }
}