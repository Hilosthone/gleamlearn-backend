// src/search/dto/search-query.dto.ts
import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class SearchQueryDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(1, { message: 'Search query must be at least 1 character long.' })
  @MaxLength(100, { message: 'Search query must be at most 100 characters long.' })
  q: string;
}