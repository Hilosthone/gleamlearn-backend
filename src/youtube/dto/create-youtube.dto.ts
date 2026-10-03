// src/youtube/dto/create-youtube.dto.ts
import { IsString, IsNotEmpty, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateYoutubeDto {
  @ApiProperty({ 
    description: 'The public URL of the YouTube educational video', 
    example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' 
  })
  @IsString()
  @IsNotEmpty()
  @IsUrl({}, { message: 'Please provide a valid HTTP/HTTPS URL' })
  url: string;
}