// // src/ai/ai.controller.ts
// import { Controller, Get, Post, Param, Body } from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
// import { AiService } from './ai.service.js';
// import { GenerateAiDto } from './dto/generate-ai.dto.js';

// @ApiTags('AI Document Processing')
// @Controller('api/v1/ai/documents')
// export class AiController {
//   constructor(private readonly aiService: AiService) {}

//   @Post(':id/analyze')
//   @ApiOperation({ summary: 'Trigger AI deep analysis on an uploaded document' })
//   @ApiBody({ type: GenerateAiDto, required: false })
//   analyzeDocument(
//     @Param('id') id: string,
//     @Body() dto?: GenerateAiDto,
//   ) {
//     return this.aiService.analyzeDocument(id, dto);
//   }

//   @Get(':id/analysis')
//   @ApiOperation({ summary: 'Retrieve cached AI analysis results for a document' })
//   getAnalysis(@Param('id') id: string) {
//     return this.aiService.getAnalysis(id);
//   }

//   @Post(':id/generate-notes')
//   @ApiOperation({ summary: 'Generate structured lecture notes from document content' })
//   @ApiBody({ type: GenerateAiDto, required: false })
//   generateNotes(
//     @Param('id') id: string,
//     @Body() dto?: GenerateAiDto,
//   ) {
//     return this.aiService.generateNotes(id, dto);
//   }

//   @Post(':id/generate-summary')
//   @ApiOperation({ summary: 'Generate executive summary from document' })
//   @ApiBody({ type: GenerateAiDto, required: false })
//   generateSummary(
//     @Param('id') id: string,
//     @Body() dto?: GenerateAiDto,
//   ) {
//     return this.aiService.generateSummary(id, dto);
//   }

//   @Post(':id/generate-flashcards')
//   @ApiOperation({ summary: 'Generate interactive study flashcards' })
//   @ApiBody({ type: GenerateAiDto, required: false })
//   generateFlashcards(
//     @Param('id') id: string,
//     @Body() dto?: GenerateAiDto,
//   ) {
//     return this.aiService.generateFlashcards(id, dto);
//   }

//   @Post(':id/generate-questions')
//   @ApiOperation({ summary: 'Generate study review questions' })
//   @ApiBody({ type: GenerateAiDto, required: false })
//   generateQuestions(
//     @Param('id') id: string,
//     @Body() dto?: GenerateAiDto,
//   ) {
//     return this.aiService.generateQuestions(id, dto);
//   }

//   @Post(':id/generate-quiz')
//   @ApiOperation({ summary: 'Generate graded quiz assessment' })
//   @ApiBody({ type: GenerateAiDto, required: false })
//   generateQuiz(
//     @Param('id') id: string,
//     @Body() dto?: GenerateAiDto,
//   ) {
//     return this.aiService.generateQuiz(id, dto);
//   }

//   @Post(':id/generate-test')
//   @ApiOperation({ summary: 'Generate comprehensive midterm test structure' })
//   @ApiBody({ type: GenerateAiDto, required: false })
//   generateTest(
//     @Param('id') id: string,
//     @Body() dto?: GenerateAiDto,
//   ) {
//     return this.aiService.generateTest(id, dto);
//   }

//   @Post(':id/generate-exam')
//   @ApiOperation({ summary: 'Generate full academic final exam papers' })
//   @ApiBody({ type: GenerateAiDto, required: false })
//   generateExam(
//     @Param('id') id: string,
//     @Body() dto?: GenerateAiDto,
//   ) {
//     return this.aiService.generateExam(id, dto);
//   }

//   @Post(':id/create-course')
//   @ApiOperation({ summary: 'Automatically construct a multi-tier course outline and topics from document' })
//   @ApiBody({ type: GenerateAiDto, required: false })
//   createCourseFromDocument(
//     @Param('id') id: string,
//     @Body() dto?: GenerateAiDto,
//   ) {
//     return this.aiService.createCourseFromDocument(id, dto);
//   }

//   @Get(':id/generated-content')
//   @ApiOperation({ summary: 'Get all AI-generated assets linked to this document' })
//   getAllGeneratedContent(@Param('id') id: string) {
//     return this.aiService.getAllGeneratedContent(id);
//   }

//   // =========================================================================
//   // INTERACTIVE LIVE AI CLASS & EXPORT ENDPOINTS
//   // =========================================================================

//   @Post(':id/generate-live-class')
//   @ApiOperation({ summary: 'Generate timeline script and visual canvas instructions for an interactive live AI class' })
//   @ApiBody({ type: GenerateAiDto, required: false })
//   generateLiveClass(
//     @Param('id') id: string,
//     @Body() dto?: GenerateAiDto,
//   ) {
//     return this.aiService.generateLiveClass(id, dto);
//   }

//   @Get(':id/live-class-stream')
//   @ApiOperation({ summary: 'Stream playback sync metadata and session states for the interactive live class player' })
//   getLiveClassStream(@Param('id') id: string) {
//     return this.aiService.getLiveClassStream(id);
//   }

//   @Post(':id/export-pdf')
//   @ApiOperation({ summary: 'Compile generated notes, class scripts, or summaries into a downloadable PDF document' })
//   @ApiBody({ type: GenerateAiDto, required: false })
//   exportPdf(
//     @Param('id') id: string,
//     @Body() dto?: GenerateAiDto,
//   ) {
//     return this.aiService.exportPdf(id, dto);
//   }
// }


// // src/ai/ai.controller.ts
// import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
// import { AiService } from './ai.service.js';
// import { GenerateAiDto } from './dto/generate-ai.dto.js';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
// import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

// @ApiTags('AI Document Processing')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
// @Controller('api/v1/ai/documents')
// export class AiController {
//   constructor(private readonly aiService: AiService) {}

//   @Post(':id/analyze')
//   @ApiOperation({ summary: 'Trigger AI deep analysis on an uploaded document' })
//   @ApiBody({ type: GenerateAiDto, required: false })
//   analyzeDocument(
//     @Param('id') id: string,
//     @Body() dto?: GenerateAiDto,
//   ) {
//     return this.aiService.analyzeDocument(id, dto);
//   }

//   @Get(':id/analysis')
//   @ApiOperation({ summary: 'Retrieve cached AI analysis results for a document' })
//   getAnalysis(@Param('id') id: string) {
//     return this.aiService.getAnalysis(id);
//   }

//   @Post(':id/generate-notes')
//   @ApiOperation({ summary: 'Generate structured lecture notes from document content' })
//   @ApiBody({ type: GenerateAiDto, required: false })
//   generateNotes(
//     @Param('id') id: string,
//     @Body() dto?: GenerateAiDto,
//   ) {
//     return this.aiService.generateNotes(id, dto);
//   }

//   @Post(':id/generate-summary')
//   @ApiOperation({ summary: 'Generate executive summary from document' })
//   @ApiBody({ type: GenerateAiDto, required: false })
//   generateSummary(
//     @Param('id') id: string,
//     @Body() dto?: GenerateAiDto,
//   ) {
//     return this.aiService.generateSummary(id, dto);
//   }

//   @Post(':id/generate-flashcards')
//   @ApiOperation({ summary: 'Generate interactive study flashcards' })
//   @ApiBody({ type: GenerateAiDto, required: false })
//   generateFlashcards(
//     @Param('id') id: string,
//     @Body() dto?: GenerateAiDto,
//   ) {
//     return this.aiService.generateFlashcards(id, dto);
//   }

//   @Post(':id/generate-questions')
//   @ApiOperation({ summary: 'Generate study review questions' })
//   @ApiBody({ type: GenerateAiDto, required: false })
//   generateQuestions(
//     @Param('id') id: string,
//     @Body() dto?: GenerateAiDto,
//   ) {
//     return this.aiService.generateQuestions(id, dto);
//   }

//   @Post(':id/generate-quiz')
//   @ApiOperation({ summary: 'Generate graded quiz assessment' })
//   @ApiBody({ type: GenerateAiDto, required: false })
//   generateQuiz(
//     @Param('id') id: string,
//     @Body() dto?: GenerateAiDto,
//   ) {
//     return this.aiService.generateQuiz(id, dto);
//   }

//   @Post(':id/generate-test')
//   @ApiOperation({ summary: 'Generate comprehensive midterm test structure' })
//   @ApiBody({ type: GenerateAiDto, required: false })
//   generateTest(
//     @Param('id') id: string,
//     @Body() dto?: GenerateAiDto,
//   ) {
//     return this.aiService.generateTest(id, dto);
//   }

//   @Post(':id/generate-exam')
//   @ApiOperation({ summary: 'Generate full academic final exam papers' })
//   @ApiBody({ type: GenerateAiDto, required: false })
//   generateExam(
//     @Param('id') id: string,
//     @Body() dto?: GenerateAiDto,
//   ) {
//     return this.aiService.generateExam(id, dto);
//   }

//   @Post(':id/create-course')
//   @ApiOperation({ summary: 'Automatically construct a multi-tier course outline and topics from document' })
//   @ApiBody({ type: GenerateAiDto, required: false })
//   createCourseFromDocument(
//     @Param('id') id: string,
//     @Body() dto?: GenerateAiDto,
//   ) {
//     return this.aiService.createCourseFromDocument(id, dto);
//   }

//   @Get(':id/generated-content')
//   @ApiOperation({ summary: 'Get all AI-generated assets linked to this document' })
//   getAllGeneratedContent(@Param('id') id: string) {
//     return this.aiService.getAllGeneratedContent(id);
//   }

//   // =========================================================================
//   // INTERACTIVE LIVE AI CLASS & EXPORT ENDPOINTS
//   // =========================================================================

//   @Post(':id/generate-live-class')
//   @ApiOperation({ summary: 'Generate timeline script and visual canvas instructions for an interactive live AI class' })
//   @ApiBody({ type: GenerateAiDto, required: false })
//   generateLiveClass(
//     @Param('id') id: string,
//     @Body() dto?: GenerateAiDto,
//   ) {
//     return this.aiService.generateLiveClass(id, dto);
//   }

//   @Get(':id/live-class-stream')
//   @ApiOperation({ summary: 'Stream playback sync metadata and session states for the interactive live class player' })
//   getLiveClassStream(@Param('id') id: string) {
//     return this.aiService.getLiveClassStream(id);
//   }

//   @Post(':id/export-pdf')
//   @ApiOperation({ summary: 'Compile generated notes, class scripts, or summaries into a downloadable PDF document' })
//   @ApiBody({ type: GenerateAiDto, required: false })
//   exportPdf(
//     @Param('id') id: string,
//     @Body() dto?: GenerateAiDto,
//   ) {
//     return this.aiService.exportPdf(id, dto);
//   }
// }



// src/ai/ai.controller.ts
import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service.js';
import { GenerateAiDto } from './dto/generate-ai.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('AI Document Processing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/ai/documents')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 10, ttl: 60000 } })
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

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 10, ttl: 60000 } })
  @Post(':id/generate-notes')
  @ApiOperation({ summary: 'Generate structured lecture notes from document content' })
  @ApiBody({ type: GenerateAiDto, required: false })
  generateNotes(
    @Param('id') id: string,
    @Body() dto?: GenerateAiDto,
  ) {
    return this.aiService.generateNotes(id, dto);
  }

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 10, ttl: 60000 } })
  @Post(':id/generate-summary')
  @ApiOperation({ summary: 'Generate executive summary from document' })
  @ApiBody({ type: GenerateAiDto, required: false })
  generateSummary(
    @Param('id') id: string,
    @Body() dto?: GenerateAiDto,
  ) {
    return this.aiService.generateSummary(id, dto);
  }

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 10, ttl: 60000 } })
  @Post(':id/generate-flashcards')
  @ApiOperation({ summary: 'Generate interactive study flashcards' })
  @ApiBody({ type: GenerateAiDto, required: false })
  generateFlashcards(
    @Param('id') id: string,
    @Body() dto?: GenerateAiDto,
  ) {
    return this.aiService.generateFlashcards(id, dto);
  }

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 10, ttl: 60000 } })
  @Post(':id/generate-questions')
  @ApiOperation({ summary: 'Generate study review questions' })
  @ApiBody({ type: GenerateAiDto, required: false })
  generateQuestions(
    @Param('id') id: string,
    @Body() dto?: GenerateAiDto,
  ) {
    return this.aiService.generateQuestions(id, dto);
  }

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 10, ttl: 60000 } })
  @Post(':id/generate-quiz')
  @ApiOperation({ summary: 'Generate graded quiz assessment' })
  @ApiBody({ type: GenerateAiDto, required: false })
  generateQuiz(
    @Param('id') id: string,
    @Body() dto?: GenerateAiDto,
  ) {
    return this.aiService.generateQuiz(id, dto);
  }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 5, ttl: 60000 } })
  @Post(':id/generate-test')
  @ApiOperation({ summary: 'Generate comprehensive midterm test structure' })
  @ApiBody({ type: GenerateAiDto, required: false })
  generateTest(
    @Param('id') id: string,
    @Body() dto?: GenerateAiDto,
  ) {
    return this.aiService.generateTest(id, dto);
  }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 5, ttl: 60000 } })
  @Post(':id/generate-exam')
  @ApiOperation({ summary: 'Generate full academic final exam papers' })
  @ApiBody({ type: GenerateAiDto, required: false })
  generateExam(
    @Param('id') id: string,
    @Body() dto?: GenerateAiDto,
  ) {
    return this.aiService.generateExam(id, dto);
  }

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 10, ttl: 60000 } })
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

  // =========================================================================
  // INTERACTIVE LIVE AI CLASS & EXPORT ENDPOINTS
  // =========================================================================

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 5, ttl: 60000 } })
  @Post(':id/generate-live-class')
  @ApiOperation({ summary: 'Generate timeline script and visual canvas instructions for an interactive live AI class' })
  @ApiBody({ type: GenerateAiDto, required: false })
  generateLiveClass(
    @Param('id') id: string,
    @Body() dto?: GenerateAiDto,
  ) {
    return this.aiService.generateLiveClass(id, dto);
  }

  @Get(':id/live-class-stream')
  @ApiOperation({ summary: 'Stream playback sync metadata and session states for the interactive live class player' })
  getLiveClassStream(@Param('id') id: string) {
    return this.aiService.getLiveClassStream(id);
  }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 5, ttl: 60000 } })
  @Post(':id/export-pdf')
  @ApiOperation({ summary: 'Compile generated notes, class scripts, or summaries into a downloadable PDF document' })
  @ApiBody({ type: GenerateAiDto, required: false })
  exportPdf(
    @Param('id') id: string,
    @Body() dto?: GenerateAiDto,
  ) {
    return this.aiService.exportPdf(id, dto);
  }
}