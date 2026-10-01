import { Controller, Get, Param, Patch, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service.js';
import { SubscriptionQueryDto } from './dto/subscription-query.dto.js';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto.js';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt.guard.js';

@ApiTags('Admin Subscription Management')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('api/v1/admin/subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @ApiOperation({ summary: 'List all platform subscriptions with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Subscriptions retrieved successfully.' })
  findAll(@Query() query: SubscriptionQueryDto) {
    return this.subscriptionsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details for a specific subscription by ID' })
  @ApiResponse({ status: 200, description: 'Subscription details retrieved successfully.' })
  findOne(@Param('id') id: string) {
    return this.subscriptionsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update subscription details or status' })
  @ApiResponse({ status: 200, description: 'Subscription updated successfully.' })
  update(@Param('id') id: string, @Body() dto: UpdateSubscriptionDto) {
    return this.subscriptionsService.update(id, dto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an active user subscription' })
  @ApiResponse({ status: 200, description: 'Subscription cancelled successfully.' })
  cancel(@Param('id') id: string) {
    return this.subscriptionsService.cancel(id);
  }

  @Post(':id/refund')
  @ApiOperation({ summary: 'Issue a refund and revoke a user subscription' })
  @ApiResponse({ status: 200, description: 'Subscription refunded successfully.' })
  refund(@Param('id') id: string) {
    return this.subscriptionsService.refund(id);
  }
}