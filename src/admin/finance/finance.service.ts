// src/admin/finance/finance.service.ts
import { featureUnavailable } from '../../common/errors/feature-unavailable.js';
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

  async getOverview(): Promise<never> {
    throw featureUnavailable('Finance', 'payments are not live, so there is no revenue, subscription or refund data (the previous figures were invented)');
  }

  async getRevenue(_query: FinanceQueryDto): Promise<never> {
    throw featureUnavailable('Finance', 'payments are not live, so there is no revenue, subscription or refund data (the previous figures were invented)');
  }

  async getTransactions(_query: FinanceQueryDto): Promise<never> {
    throw featureUnavailable('Finance', 'payments are not live, so there is no revenue, subscription or refund data (the previous figures were invented)');
  }

  async getSubscriptions(_query: FinanceQueryDto): Promise<never> {
    throw featureUnavailable('Finance', 'payments are not live, so there is no revenue, subscription or refund data (the previous figures were invented)');
  }

  async getRefunds(_query: FinanceQueryDto): Promise<never> {
    throw featureUnavailable('Finance', 'payments are not live, so there is no revenue, subscription or refund data (the previous figures were invented)');
  }

  async getDailyRevenue(): Promise<never> {
    throw featureUnavailable('Finance', 'payments are not live, so there is no revenue, subscription or refund data (the previous figures were invented)');
  }

  async getMonthlyRevenue(): Promise<never> {
    throw featureUnavailable('Finance', 'payments are not live, so there is no revenue, subscription or refund data (the previous figures were invented)');
  }
}