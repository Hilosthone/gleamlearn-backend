// src/coins/coins.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoinsController } from './coins.controller.js';
import { CoinsService } from './coins.service.js';
import { CoinTransaction } from './entities/coin-transaction.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([CoinTransaction])],
  controllers: [CoinsController],
  providers: [CoinsService],
  exports: [CoinsService], 
})

export class CoinsModule{}
