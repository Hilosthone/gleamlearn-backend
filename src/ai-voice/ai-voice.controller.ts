// // src/ai-voice/ai-voice.controller.ts
// import { Controller, Post, Body, UseGuards } from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
// import { AiVoiceService } from './ai-voice.service.js';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
// import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

// @ApiTags('Voice AI')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard) // Secures all voice routing behind valid JWT logins
// @Controller('api/v1/ai/voice')
// export class AiVoiceController {
//   constructor(private readonly voiceService: AiVoiceService) {}

//   @Post('transcribe')
//   @ApiOperation({ summary: 'Transcribe recorded audio clips to text' })
//   transcribe(@CurrentUser() user: any, @Body() dto: any) {
//     // Optionally attach userId to payload if Python needs user context
//     const payload = { ...dto, userId: user.id };
//     return this.voiceService.proxyToPython('transcribe', payload);
//   }

//   @Post('respond')
//   @ApiOperation({ summary: 'Process speech text to generate conversational AI responses' })
//   respond(@CurrentUser() user: any, @Body() dto: any) {
//     const payload = { ...dto, userId: user.id };
//     return this.voiceService.proxyToPython('respond', payload);
//   }

//   @Post('synthesize')
//   @ApiOperation({ summary: 'Synthesize text answers back into audio streams/metadata' })
//   synthesize(@CurrentUser() user: any, @Body() dto: any) {
//     const payload = { ...dto, userId: user.id };
//     return this.voiceService.proxyToPython('synthesize', payload);
//   }
// }




// src/ai-voice/ai-voice.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler'; // <-- 1. Import Throttle
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiVoiceService } from './ai-voice.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('Voice AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/ai/voice')
export class AiVoiceController {
  constructor(private readonly voiceService: AiVoiceService) {}

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 10, ttl: 60000 } }) // <-- 2. Protect transcription
  @Post('transcribe')
  @ApiOperation({ summary: 'Transcribe recorded audio clips to text' })
  transcribe(@CurrentUser() user: any, @Body() dto: any) {
    const payload = { ...dto, userId: user.id };
    return this.voiceService.proxyToPython('transcribe', payload);
  }

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 15, ttl: 60000 } }) // <-- 3. Protect conversational responses
  @Post('respond')
  @ApiOperation({ summary: 'Process speech text to generate conversational AI responses' })
  respond(@CurrentUser() user: any, @Body() dto: any) {
    const payload = { ...dto, userId: user.id };
    return this.voiceService.proxyToPython('respond', payload);
  }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 10, ttl: 60000 } }) // <-- 4. Protect text-to-speech synthesis
  @Post('synthesize')
  @ApiOperation({ summary: 'Synthesize text answers back into audio streams/metadata' })
  synthesize(@CurrentUser() user: any, @Body() dto: any) {
    const payload = { ...dto, userId: user.id };
    return this.voiceService.proxyToPython('synthesize', payload);
  }
}