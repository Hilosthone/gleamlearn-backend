// // src/subscriptions/subscriptions.controller.ts
// import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
// import { SubscriptionsService } from './subscriptions.service.js';
// import { SubscribeDto } from './dto/subscribe.dto.js';
// import { InitializePaymentDto } from './dto/initialize-payment.dto.js';
// import { VerifyPaymentDto } from './dto/verify-payment.dto.js';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
// import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

// @ApiTags('Subscriptions & Payments')
// @Controller('api/v1')
// export class SubscriptionsController {
//   constructor(private readonly subscriptionsService: SubscriptionsService) {}

//   @Get('plans')
//   @ApiOperation({ summary: 'Get available subscription plans' })
//   @ApiResponse({ status: 200, description: 'List of subscription plans retrieved successfully.' })
//   async getPlans() {
//     return this.subscriptionsService.getPlans();
//   }

//   @ApiBearerAuth()
//   @UseGuards(JwtAuthGuard)
//   @Get('subscription')
//   @ApiOperation({ summary: 'Get current user active subscription details' })
//   @ApiResponse({ status: 200, description: 'Current subscription retrieved.' })
//   async getCurrentSubscription(@CurrentUser() user: any) {
//     return this.subscriptionsService.getCurrentSubscription(user.id);
//   }

//   @ApiBearerAuth()
//   @UseGuards(JwtAuthGuard)
//   @Post('subscription/subscribe')
//   @ApiOperation({ summary: 'Subscribe to a plan' })
//   @ApiResponse({ status: 201, description: 'Successfully subscribed to plan.' })
//   async subscribe(@Body() dto: SubscribeDto, @CurrentUser() user: any) {
//     return this.subscriptionsService.subscribe(dto, user.id);
//   }

//   @ApiBearerAuth()
//   @UseGuards(JwtAuthGuard)
//   @Post('subscription/cancel')
//   @ApiOperation({ summary: 'Cancel current active subscription' })
//   @ApiResponse({ status: 200, description: 'Subscription successfully cancelled.' })
//   async cancelSubscription(@CurrentUser() user: any) {
//     return this.subscriptionsService.cancelSubscription(user.id);
//   }

//   @ApiBearerAuth()
//   @UseGuards(JwtAuthGuard)
//   @Post('subscription/upgrade')
//   @ApiOperation({ summary: 'Upgrade current subscription plan' })
//   @ApiResponse({ status: 200, description: 'Subscription successfully upgraded.' })
//   async upgradeSubscription(@Body() dto: SubscribeDto, @CurrentUser() user: any) {
//     return this.subscriptionsService.upgradeSubscription(dto, user.id);
//   }

//   @ApiBearerAuth()
//   @UseGuards(JwtAuthGuard)
//   @Get('subscription/history')
//   @ApiOperation({ summary: 'Get user subscription and billing history' })
//   @ApiResponse({ status: 200, description: 'Subscription history retrieved.' })
//   async getSubscriptionHistory(@CurrentUser() user: any) {
//     return this.subscriptionsService.getSubscriptionHistory(user.id);
//   }

//   @ApiBearerAuth()
//   @UseGuards(JwtAuthGuard)
//   @Post('payments/initialize')
//   @ApiOperation({ summary: 'Initialize a payment transaction (e.g. Paystack / Flutterwave)' })
//   @ApiResponse({ status: 201, description: 'Payment gateway initialization URL generated.' })
//   async initializePayment(@Body() dto: InitializePaymentDto, @CurrentUser() user: any) {
//     return this.subscriptionsService.initializePayment(dto, user);
//   }

//   @ApiBearerAuth()
//   @UseGuards(JwtAuthGuard)
//   @Post('payments/verify')
//   @ApiOperation({ summary: 'Verify a payment transaction reference' })
//   @ApiResponse({ status: 200, description: 'Payment verification completed.' })
//   async verifyPayment(@Body() dto: VerifyPaymentDto, @CurrentUser() user: any) {
//     return this.subscriptionsService.verifyPayment(dto.reference, user.id);
//   }

//   @Post('payments/webhook')
//   @ApiOperation({ summary: 'Payment gateway webhook listener' })
//   @ApiResponse({ status: 200, description: 'Webhook event handled successfully.' })
//   async handleWebhook(@Body() eventPayload: any) {
//     return this.subscriptionsService.handleWebhook(eventPayload);
//   }
// }



// src/subscriptions/subscriptions.controller.ts
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service.js';
import { SubscribeDto } from './dto/subscribe.dto.js';
import { InitializePaymentDto } from './dto/initialize-payment.dto.js';
import { VerifyPaymentDto } from './dto/verify-payment.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('Subscriptions & Payments')
@Controller('api/v1')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  @ApiOperation({ summary: 'Get available subscription plans' })
  @ApiResponse({ status: 200, description: 'List of subscription plans retrieved successfully.' })
  async getPlans() {
    return this.subscriptionsService.getPlans();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('subscription')
  @ApiOperation({ summary: 'Get current user active subscription details' })
  @ApiResponse({ status: 200, description: 'Current subscription retrieved.' })
  async getCurrentSubscription(@CurrentUser() user: any) {
    return this.subscriptionsService.getCurrentSubscription(user.id);
  }

  @Throttle({ short: { limit: 1, ttl: 5000 }, long: { limit: 5, ttl: 60000 } })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('subscription/subscribe')
  @ApiOperation({ summary: 'Subscribe to a plan' })
  @ApiResponse({ status: 201, description: 'Successfully subscribed to plan.' })
  async subscribe(@Body() dto: SubscribeDto, @CurrentUser() user: any) {
    return this.subscriptionsService.subscribe(dto, user.id);
  }

  @Throttle({ short: { limit: 1, ttl: 5000 }, long: { limit: 5, ttl: 60000 } })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('subscription/cancel')
  @ApiOperation({ summary: 'Cancel current active subscription' })
  @ApiResponse({ status: 200, description: 'Subscription successfully cancelled.' })
  async cancelSubscription(@CurrentUser() user: any) {
    return this.subscriptionsService.cancelSubscription(user.id);
  }

  @Throttle({ short: { limit: 1, ttl: 5000 }, long: { limit: 5, ttl: 60000 } })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('subscription/upgrade')
  @ApiOperation({ summary: 'Upgrade current subscription plan' })
  @ApiResponse({ status: 200, description: 'Subscription successfully upgraded.' })
  async upgradeSubscription(@Body() dto: SubscribeDto, @CurrentUser() user: any) {
    return this.subscriptionsService.upgradeSubscription(dto, user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('subscription/history')
  @ApiOperation({ summary: 'Get user subscription and billing history' })
  @ApiResponse({ status: 200, description: 'Subscription history retrieved.' })
  async getSubscriptionHistory(@CurrentUser() user: any) {
    return this.subscriptionsService.getSubscriptionHistory(user.id);
  }

  @Throttle({ short: { limit: 1, ttl: 5000 }, long: { limit: 5, ttl: 60000 } })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('payments/initialize')
  @ApiOperation({ summary: 'Initialize a payment transaction (e.g. Paystack / Flutterwave)' })
  @ApiResponse({ status: 201, description: 'Payment gateway initialization URL generated.' })
  async initializePayment(@Body() dto: InitializePaymentDto, @CurrentUser() user: any) {
    return this.subscriptionsService.initializePayment(dto, user);
  }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 10, ttl: 60000 } })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('payments/verify')
  @ApiOperation({ summary: 'Verify a payment transaction reference' })
  @ApiResponse({ status: 200, description: 'Payment verification completed.' })
  async verifyPayment(@Body() dto: VerifyPaymentDto, @CurrentUser() user: any) {
    return this.subscriptionsService.verifyPayment(dto.reference, user.id);
  }

  @Post('payments/webhook')
  @ApiOperation({ summary: 'Payment gateway webhook listener' })
  @ApiResponse({ status: 200, description: 'Webhook event handled successfully.' })
  async handleWebhook(@Body() eventPayload: any) {
    return this.subscriptionsService.handleWebhook(eventPayload);
  }
}