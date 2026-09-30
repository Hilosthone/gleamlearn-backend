// src/admin/finance/finance.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CoinTransaction } from './entities/coin-transaction.entity.js'; 
import { FinanceQueryDto } from './dto/finance-query.dto.js';

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(CoinTransaction)
    private readonly transactionRepo: Repository<CoinTransaction>,
  ) {}

  async getOverview() {
    return {
      status: 'success',
      data: {
        totalRevenueUSD: 145250.00,
        monthlyRecurringRevenue: 12400.00,
        activeSubscriptions: 850,
        pendingRefunds: 4,
        currency: 'USD',
      },
    };
  }

  async getRevenue(query: FinanceQueryDto) {
    const { timeframe = 'monthly' } = query;
    return {
      status: 'success',
      timeframe,
      data: {
        grossRevenue: 145250.00,
        netRevenue: 131100.00,
        platformFees: 14150.00,
        breakdown: [
          { period: timeframe === 'monthly' ? 'Sep 2026' : 'Week 39', amount: 12400.00 },
          { period: timeframe === 'monthly' ? 'Aug 2026' : 'Week 38', amount: 11500.00 },
        ],
      },
    };
  }

  async getTransactions(query: FinanceQueryDto) {
    const { page = 1, limit = 10 } = query;
    
    // In production, query transactions repository with pagination
    return {
      status: 'success',
      data: {
        transactions: [
          { id: 'tx_01', userEmail: 'student@gleamlearn.com', amount: 29.99, type: 'SUBSCRIPTION', status: 'SUCCESS', createdAt: new Date() },
          { id: 'tx_02', userEmail: 'learner@gleamlearn.com', amount: 9.99, type: 'COIN_BUNDLE', status: 'SUCCESS', createdAt: new Date() },
        ],
        pagination: { total: 2, page, limit, totalPages: 1 },
      },
    };
  }

  async getSubscriptions(query: FinanceQueryDto) {
    const { page = 1, limit = 10 } = query;
    return {
      status: 'success',
      data: {
        subscriptions: [
          { id: 'sub_01', plan: 'Pro Annual', userEmail: 'student@gleamlearn.com', status: 'ACTIVE', renewalDate: '2027-09-30' },
        ],
        pagination: { total: 1, page, limit, totalPages: 1 },
      },
    };
  }

  async getRefunds(query: FinanceQueryDto) {
    const { page = 1, limit = 10 } = query;
    return {
      status: 'success',
      data: {
        refunds: [
          { id: 'ref_01', transactionId: 'tx_99', userEmail: 'user@gleamlearn.com', amount: 15.00, reason: 'Accidental Purchase', status: 'PENDING' },
        ],
        pagination: { total: 1, page, limit, totalPages: 1 },
      },
    };
  }

  async getDailyRevenue() {
    return {
      status: 'success',
      data: {
        period: 'daily',
        revenuePoints: [
          { date: '2026-09-29', amount: 450.00 },
          { date: '2026-09-30', amount: 620.00 },
        ],
      },
    };
  }

  async getMonthlyRevenue() {
    return {
      status: 'success',
      data: {
        period: 'monthly',
        revenuePoints: [
          { month: 'Jul 2026', amount: 10500.00 },
          { month: 'Aug 2026', amount: 11500.00 },
          { month: 'Sep 2026', amount: 12400.00 },
        ],
      },
    };
  }
}