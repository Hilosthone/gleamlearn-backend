// src/library/dto/add-favorite.dto.ts
import { IsEnum, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum FavoriteType {
  TOPIC = 'TOPIC',
  MATERIAL = 'MATERIAL',
  QUIZ = 'QUIZ',
  TEST = 'TEST',
  EXAM = 'EXAM',
}

export class AddFavoriteDto {
  @ApiProperty({ 
    description: 'The type of library item being favorited', 
    enum: FavoriteType,
    default: FavoriteType.MATERIAL 
  })
  @IsEnum(FavoriteType)
  @IsNotEmpty()
  type: FavoriteType;
}