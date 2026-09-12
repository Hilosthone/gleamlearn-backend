// // src/ai/ai.controller.ts
// import { Controller, Get, Post, Param } from '@nestjs/common';
// import { ApiTags, ApiOperation } from '@nestjs/swagger';
// import { AiService } from './ai.service.js';

// @ApiTags('AI Document Processing')
// @Controller('api/v1/ai/documents')
// export class AiController {
//   constructor(private readonly aiService: AiService) {}

//   @Post(':id/analyze')
//   @ApiOperation({ summary: 'Trigger AI deep analysis on an uploaded document' })
//   analyzeDocument(@Param('id') id: string) {
//     return this.aiService.analyzeDocument(id);
//   }

//   @Get(':id/analysis')
//   @ApiOperation({ summary: 'Retrieve cached AI analysis results for a document' })
//   getAnalysis(@Param('id') id: string) {
//     return this.aiService.getAnalysis(id);
//   }

//   @Post(':id/generate-notes')
//   @ApiOperation({ summary: 'Generate structured lecture notes from document content' })
//   generateNotes(@Param('id') id: string) {
//     return this.aiService.generateNotes(id);
//   }

//   @Post(':id/generate-summary')
//   @ApiOperation({ summary: 'Generate executive summary from document' })
//   generateSummary(@Param('id') id: string) {
//     return this.aiService.generateSummary(id);
//   }

//   @Post(':id/generate-flashcards')
//   @ApiOperation({ summary: 'Generate interactive study flashcards' })
//   generateFlashcards(@Param('id') id: string) {
//     return this.aiService.generateFlashcards(id);
//   }

//   @Post(':id/generate-questions')
//   @ApiOperation({ summary: 'Generate study review questions' })
//   generateQuestions(@Param('id') id: string) {
//     return this.aiService.generateQuestions(id);
//   }

//   @Post(':id/generate-quiz')
//   @ApiOperation({ summary: 'Generate graded quiz assessment' })
//   generateQuiz(@Param('id') id: string) {
//     return this.aiService.generateQuiz(id);
//   }

//   @Post(':id/generate-test')
//   @ApiOperation({ summary: 'Generate comprehensive midterm test structure' })
//   generateTest(@Param('id') id: string) {
//     return this.aiService.generateTest(id);
//   }

//   @Post(':id/generate-exam')
//   @ApiOperation({ summary: 'Generate full academic final exam papers' })
//   generateExam(@Param('id') id: string) {
//     return this.aiService.generateExam(id);
//   }

//   @Post(':id/create-course')
//   @ApiOperation({ summary: 'Automatically construct a multi-tier course outline and topics from document' })
//   createCourseFromDocument(@Param('id') id: string) {
//     return this.aiService.createCourseFromDocument(id);
//   }

//   @Get(':id/generated-content')
//   @ApiOperation({ summary: 'Get all AI-generated assets linked to this document' })
//   getAllGeneratedContent(@Param('id') id: string) {
//     return this.aiService.getAllGeneratedContent(id);
//   }
// }

// src/ai/ai.controller.ts
import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { AiService } from './ai.service.js';
import { GenerateAiDto } from './dto/generate-ai.dto.js';

@ApiTags('AI Document Processing')
@Controller('api/v1/ai/documents')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post(':id/analyze')
  @ApiOperation({ summary: 'Trigger AI deep analysis on an uploaded document' })
  @ApiBody({ type: GenerateAiDto, required: false })
  analyzeDocument(
    @Param('id') id: string,
    @Body() dto?: GenerateAiDto,
  ) {
    return this.aiService.analyzeDocument(id, dto);
  }

  @Get(':id/analysis')
  @ApiOperation({ summary: 'Retrieve cached AI analysis results for a document' })
  getAnalysis(@Param('id') id: string) {
    return this.aiService.getAnalysis(id);
  }

  @Post(':id/generate-notes')
  @ApiOperation({ summary: 'Generate structured lecture notes from document content' })
  @ApiBody({ type: GenerateAiDto, required: false })
  generateNotes(
    @Param('id') id: string,
    @Body() dto?: GenerateAiDto,
  ) {
    return this.aiService.generateNotes(id, dto);
  }

  @Post(':id/generate-summary')
  @ApiOperation({ summary: 'Generate executive summary from document' })
  @ApiBody({ type: GenerateAiDto, required: false })
  generateSummary(
    @Param('id') id: string,
    @Body() dto?: GenerateAiDto,
  ) {
    return this.aiService.generateSummary(id, dto);
  }

  @Post(':id/generate-flashcards')
  @ApiOperation({ summary: 'Generate interactive study flashcards' })
  @ApiBody({ type: GenerateAiDto, required: false })
  generateFlashcards(
    @Param('id') id: string,
    @Body() dto?: GenerateAiDto,
  ) {
    return this.aiService.generateFlashcards(id, dto);
  }

  @Post(':id/generate-questions')
  @ApiOperation({ summary: 'Generate study review questions' })
  @ApiBody({ type: GenerateAiDto, required: false })
  generateQuestions(
    @Param('id') id: string,
    @Body() dto?: GenerateAiDto,
  ) {
    return this.aiService.generateQuestions(id, dto);
  }

  @Post(':id/generate-quiz')
  @ApiOperation({ summary: 'Generate graded quiz assessment' })
  @ApiBody({ type: GenerateAiDto, required: false })
  generateQuiz(
    @Param('id') id: string,
    @Body() dto?: GenerateAiDto,
  ) {
    return this.aiService.generateQuiz(id, dto);
  }

  @Post(':id/generate-test')
  @ApiOperation({ summary: 'Generate comprehensive midterm test structure' })
  @ApiBody({ type: GenerateAiDto, required: false })
  generateTest(
    @Param('id') id: string,
    @Body() dto?: GenerateAiDto,
  ) {
    return this.aiService.generateTest(id, dto);
  }

  @Post(':id/generate-exam')
  @ApiOperation({ summary: 'Generate full academic final exam papers' })
  @ApiBody({ type: GenerateAiDto, required: false })
  generateExam(
    @Param('id') id: string,
    @Body() dto?: GenerateAiDto,
  ) {
    return this.aiService.generateExam(id, dto);
  }

  @Post(':id/create-course')
  @ApiOperation({ summary: 'Automatically construct a multi-tier course outline and topics from document' })
  @ApiBody({ type: GenerateAiDto, required: false })
  createCourseFromDocument(
    @Param('id') id: string,
    @Body() dto?: GenerateAiDto,
  ) {
    return this.aiService.createCourseFromDocument(id, dto);
  }

  @Get(':id/generated-content')
  @ApiOperation({ summary: 'Get all AI-generated assets linked to this document' })
  getAllGeneratedContent(@Param('id') id: string) {
    return this.aiService.getAllGeneratedContent(id);
  }
}