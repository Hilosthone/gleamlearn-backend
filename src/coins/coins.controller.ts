// src/coins/coins.controller.ts
import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { CoinsService } from './coins.service.js';
import { SpendCoinsDto } from './dto/spend-coins.dto.js';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
  };
}

@ApiTags('Coins & Economy')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/coins')
export class CoinsController {
  constructor(private readonly coinsService: CoinsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get coin balance overview',
    description: 'Retrieves the authenticated user total available coin balance.'
  })
  @ApiResponse({ status: 200, description: 'Successfully retrieved coin balance.' })
  async getBalance(@Req() req: RequestWithUser) {
    return await this.coinsService.getUserBalance(req.user.id);
  }

  @Get('history')
  @ApiOperation({
    summary: 'Get coin transaction history',
    description: 'Returns a chronological ledger of all coin earnings and deductions.'
  })
  @ApiResponse({ status: 200, description: 'Successfully retrieved coin history.' })
  async getHistory(@Req() req: RequestWithUser) {
    return await this.coinsService.getCoinHistory(req.user.id);
  }

  @Get('transactions')
  @ApiOperation({
    summary: 'Get coin transactions list',
    description: 'Alias endpoint for full ledger entries auditing.'
  })
  @ApiResponse({ status: 200, description: 'Successfully retrieved transactions list.' })
  async getTransactions(@Req() req: RequestWithUser) {
    return await this.coinsService.getCoinHistory(req.user.id);
  }

  @Post('spend')
  @ApiOperation({
    summary: 'Spend coins securely',
    description: 'Server-side validated endpoint allowing users to spend coins for purchases or store items if balance permits.'
  })
  @ApiResponse({ status: 201, description: 'Coins spent successfully and transaction logged.' })
  @ApiResponse({ status: 400, description: 'Insufficient balance or invalid amount.' })
  async spendCoins(@Req() req: RequestWithUser, @Body() dto: SpendCoinsDto) {
    return await this.coinsService.spendCoins(
      req.user.id,
      dto.amount,
      dto.source,
      dto.description || 'Coin expenditure'
    );
  }
}