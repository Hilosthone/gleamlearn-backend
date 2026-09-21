// src/subscriptions/dto/initialize-payment.dto.ts
import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class InitializePaymentDto {
  @IsString()
  @IsNotEmpty()
  planId: string;

  @IsNumber()
  @Min(100)
  amount: number;
}