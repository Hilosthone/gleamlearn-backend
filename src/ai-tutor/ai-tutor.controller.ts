// src/ai-tutor/ai-tutor.controller.ts
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiTutorService } from './ai-tutor.service.js';
import { CreateSessionDto, TutorMessageDto, TutorActionDto } from './dto/ai-tutor.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('AI Tutor')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard) // <-- Secures the entire controller with JWT verification
@Controller('api/v1/ai-tutor')
export class AiTutorController {
  constructor(private readonly tutorService: AiTutorService) {}

  @Post('sessions')
  @ApiOperation({ summary: 'Create a new interactive AI tutor classroom session' })
  createSession(@CurrentUser() user: any, @Body() dto: CreateSessionDto) {
    return this.tutorService.createSession(user.id, dto.title);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Retrieve all classroom sessions for the authenticated user' })
  getSessions(@CurrentUser() user: any) {
    return this.tutorService.getSessions(user.id);
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get a specific tutor session by ID with its messages' })
  getSessionById(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tutorService.getSessionById(id, user.id);
  }

  @Post('sessions/:id/message')
  @ApiOperation({ summary: 'Send a message to the AI tutor within a session' })
  addMessage(@Param('id') id: string, @CurrentUser() user: any, @Body() dto: TutorMessageDto) {
    return this.tutorService.addMessage(id, user.id, dto.message);
  }

  @Post('sessions/:id/question')
  @ApiOperation({ summary: 'Ask a targeted review question to the AI tutor' })
  askQuestion(@Param('id') id: string, @CurrentUser() user: any, @Body() dto: TutorMessageDto) {
    return this.tutorService.addMessage(id, user.id, `Question: ${dto.message}`);
  }

  @Post('sessions/:id/answer')
  @ApiOperation({ summary: 'Submit an answer response to a tutor prompt' })
  submitAnswer(@Param('id') id: string, @CurrentUser() user: any, @Body() dto: TutorMessageDto) {
    return this.tutorService.addMessage(id, user.id, `Answer: ${dto.message}`);
  }

  @Post('sessions/:id/end')
  @ApiOperation({ summary: 'End an active classroom session' })
  endSession(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tutorService.endSession(id, user.id);
  }

  // --- Specialized Teaching Actions ---

  @Post('teach')
  @ApiOperation({ summary: 'Trigger python AI microservice to teach a specific topic' })
  teachTopic(@Body() dto: TutorActionDto) {
    return this.tutorService.callGeneralTool('ai-tutor/teach', dto);
  }

  @Post('explain')
  @ApiOperation({ summary: 'Trigger python AI microservice to explain a concept' })
  explainConcept(@Body() dto: TutorActionDto) {
    return this.tutorService.callGeneralTool('ai-tutor/explain', dto);
  }

  @Post('generate-diagram')
  @ApiOperation({ summary: 'Generate structural diagram specs via AI' })
  generateDiagram(@Body() dto: TutorActionDto) {
    return this.tutorService.callGeneralTool('ai-tutor/generate-diagram', dto);
  }

  @Post('drawing-instructions')
  @ApiOperation({ summary: 'Get canvas drawing layout instructions for concepts' })
  drawingInstructions(@Body() dto: TutorActionDto) {
    return this.tutorService.callGeneralTool('ai-tutor/drawing-instructions', dto);
  }
}