// src/admin/finance/finance.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinanceController } from './finance.controller.js';
import { FinanceService } from './finance.service.js';
import { CoinTransaction } from './entities/coin-transaction.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([CoinTransaction])],
  controllers: [FinanceController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}