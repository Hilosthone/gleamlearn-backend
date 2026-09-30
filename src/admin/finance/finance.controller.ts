// src/admin/finance/finance.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { FinanceService } from './finance.service.js';
import { FinanceQueryDto } from './dto/finance-query.dto.js';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt.guard.js';

@ApiTags('Admin Revenue & Finance')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('api/v1/admin/finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get financial overview and key financial metrics' })
  @ApiResponse({ status: 200, description: 'Financial overview retrieved successfully.' })
  getOverview() {
    return this.financeService.getOverview();
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get overall revenue breakdown' })
  @ApiResponse({ status: 200, description: 'Revenue metrics retrieved successfully.' })
  getRevenue(@Query() query: FinanceQueryDto) {
    return this.financeService.getRevenue(query);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'List all financial transactions with filters' })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully.' })
  getTransactions(@Query() query: FinanceQueryDto) {
    return this.financeService.getTransactions(query);
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'List active and past platform subscriptions' })
  @ApiResponse({ status: 200, description: 'Subscriptions retrieved successfully.' })
  getSubscriptions(@Query() query: FinanceQueryDto) {
    return this.financeService.getSubscriptions(query);
  }

  @Get('refunds')
  @ApiOperation({ summary: 'List user refund requests and statuses' })
  @ApiResponse({ status: 200, description: 'Refunds retrieved successfully.' })
  getRefunds(@Query() query: FinanceQueryDto) {
    return this.financeService.getRefunds(query);
  }

  @Get('revenue/daily')
  @ApiOperation({ summary: 'Get daily revenue time-series data' })
  @ApiResponse({ status: 200, description: 'Daily revenue retrieved successfully.' })
  getDailyRevenue() {
    return this.financeService.getDailyRevenue();
  }

  @Get('revenue/monthly')
  @ApiOperation({ summary: 'Get monthly revenue time-series data' })
  @ApiResponse({ status: 200, description: 'Monthly revenue retrieved successfully.' })
  getMonthlyRevenue() {
    return this.financeService.getMonthlyRevenue();
  }
}