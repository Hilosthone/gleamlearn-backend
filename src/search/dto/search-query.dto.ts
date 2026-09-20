// src/search/dto/search-query.dto.ts
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class SearchQueryDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1, { message: 'Search query must be at least 1 character long.' })
  q: string;
}