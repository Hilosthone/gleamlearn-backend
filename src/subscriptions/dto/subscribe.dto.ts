// src/subscriptions/dto/subscribe.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

export class SubscribeDto {
  @IsString()
  @IsNotEmpty()
  planId: string;
}