// // src/ai/dto/generate-ai.dto.ts
// import { IsString, IsOptional, IsEnum } from 'class-validator';
// import { ApiPropertyOptional } from '@nestjs/swagger';

// export enum OutputTone {
//   ACADEMIC = 'ACADEMIC',
//   CASUAL = 'CASUAL',
//   CONCISE = 'CONCISE',
//   DETAILED = 'DETAILED',
// }

// export class GenerateAiDto {
//   @ApiPropertyOptional({ description: 'Custom prompt override or extra instruction for the AI' })
//   @IsOptional()
//   @IsString()
//   customPrompt?: string;

//   @ApiPropertyOptional({ enum: OutputTone, description: 'Desired tone of the generated academic content' })
//   @IsOptional()
//   @IsEnum(OutputTone)
//   tone?: OutputTone;

//   @ApiPropertyOptional({ description: 'Target language code (e.g. en, fr, ar)', default: 'en' })
//   @IsOptional()
//   @IsString()
//   language?: string;
// }


// src/ai/dto/generate-ai.dto.ts
import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum OutputTone {
  ACADEMIC = 'ACADEMIC',
  CASUAL = 'CASUAL',
  CONCISE = 'CONCISE',
  DETAILED = 'DETAILED',
}

export enum VideoQuality {
  STANDARD = '720p',
  HD = '1080p',
  ULTRA = '4K',
}

export class GenerateAiDto {
  @ApiPropertyOptional({ description: 'Custom prompt override or extra instruction for the AI' })
  @IsOptional()
  @IsString()
  customPrompt?: string;

  @ApiPropertyOptional({ enum: OutputTone, description: 'Desired tone of the generated academic content' })
  @IsOptional()
  @IsEnum(OutputTone)
  tone?: OutputTone;

  @ApiPropertyOptional({ description: 'Target language code (e.g. en, fr, ar)', default: 'en' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Enable visual canvas rendering cues for live AI classes', default: true })
  @IsOptional()
  @IsBoolean()
  includeVisuals?: boolean;

  @ApiPropertyOptional({ enum: VideoQuality, description: 'Desired video output resolution for the live class session' })
  @IsOptional()
  @IsEnum(VideoQuality)
  videoQuality?: VideoQuality;

  @ApiPropertyOptional({ description: 'Playback speed modifier or duration target in minutes' })
  @IsOptional()
  @IsNumber()
  durationMinutes?: number;
}