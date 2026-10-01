import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionsController } from './subscriptions.controller.js';
import { SubscriptionsService } from './subscriptions.service.js';
import { AdminSubscription } from './entities/admin-subscription.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([AdminSubscription])],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class AdminSubscriptionsModule {}