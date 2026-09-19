// src/personal-ai/personal-ai.controller.ts
import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PersonalAiService } from './personal-ai.service.js';
import { ChatMessageDto, ContextualAiDto, EvaluateAnswerDto } from './dto/personal-ai.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('Personal AI Assistant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/ai')
export class PersonalAiController {
  constructor(private readonly personalAiService: PersonalAiService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Send message to AI chat assistant' })
  @ApiResponse({ status: 201, description: 'AI response generated successfully.' })
  chat(@CurrentUser() user: any, @Body() dto: ChatMessageDto) {
    return this.personalAiService.chat(user.id, dto.message, dto.conversationId);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List all user AI conversations' })
  getConversations(@CurrentUser() user: any) {
    return this.personalAiService.getConversations(user.id);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Create a new AI conversation session' })
  createConversation(@CurrentUser() user: any, @Body('title') title: string) {
    return this.personalAiService.createConversation(user.id, title);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get specific conversation thread by ID' })
  getConversationById(@CurrentUser() user: any, @Param('id') id: string) {
    return this.personalAiService.getConversationById(user.id, id);
  }

  @Delete('conversations/:id')
  @ApiOperation({ summary: 'Delete AI conversation thread' })
  deleteConversation(@CurrentUser() user: any, @Param('id') id: string) {
    return this.personalAiService.deleteConversation(user.id, id);
  }

  // Contextual AI Endpoints (Stateless helpers, but can optionally accept userId if needed)
  @Post('explain')
  @ApiOperation({ summary: 'Get AI explanation for a concept or snippet' })
  explain(@Body() dto: ContextualAiDto) {
    return this.personalAiService.explainConcept(dto.input, dto.context);
  }

  @Post('summarize')
  @ApiOperation({ summary: 'Get AI summary of study notes or text' })
  summarize(@Body() dto: ContextualAiDto) {
    return this.personalAiService.summarizeText(dto.input);
  }

  @Post('generate-example')
  @ApiOperation({ summary: 'Generate real-world example for a topic' })
  generateExample(@Body() dto: ContextualAiDto) {
    return this.personalAiService.generateExample(dto.input);
  }

  @Post('generate-practice')
  @ApiOperation({ summary: 'Generate practice quiz question from text' })
  generatePractice(@Body() dto: ContextualAiDto) {
    return this.personalAiService.generatePractice(dto.input);
  }

  @Post('evaluate-answer')
  @ApiOperation({ summary: 'Evaluate user answers against grading criteria' })
  evaluateAnswer(@Body() dto: EvaluateAnswerDto) {
    return this.personalAiService.evaluateAnswer(dto);
  }

  @Post('explain-mistake')
  @ApiOperation({ summary: 'Analyze user answer and explain mistakes' })
  explainMistake(@Body() dto: EvaluateAnswerDto) {
    return this.personalAiService.explainMistake(dto);
  }
}