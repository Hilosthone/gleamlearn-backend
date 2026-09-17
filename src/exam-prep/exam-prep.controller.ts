// // src/exam-prep/exam-prep.controller.ts
// import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
// import { ExamPrepService } from './exam-prep.service.js';
// import { CreateExamPrepDto } from './dto/create-exam-prep.dto.js';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

// @UseGuards(JwtAuthGuard)
// @Controller('api/v1')
// export class ExamPrepController {
//   constructor(private readonly service: ExamPrepService) {}

//   // --- Examination Types ---
//   @Get('examinations')
//   getExaminations() { return this.service.findAllExaminations(); }

//   @Get('examinations/:id')
//   getExaminationById(@Param('id') id: string) { return this.service.findExaminationById(id); }

//   // --- Past Questions ---
//   @Get('past-questions')
//   getPastQuestions(@Query() query: any) { return this.service.findAllPastQuestions(query); }

//   @Get('past-questions/years')
//   getYears() { return this.service.getDistinctYears(); }

//   @Get('past-questions/subjects')
//   getSubjects() { return this.service.getDistinctSubjects(); }

//   @Get('past-questions/topics')
//   getTopics() { return this.service.getDistinctTopics(); }

//   @Get('past-questions/:id')
//   getPastQuestionById(@Param('id') id: string) { return this.service.findPastQuestionById(id); }

//   // --- Exam Preparation ---
//   @Post('exam-prep')
//   createPrep(@Body() dto: CreateExamPrepDto) { return this.service.createPrepPlan(dto); }

//   @Get('exam-prep')
//   getPreps() { return this.service.findAllPrepPlans(); }

//   @Get('exam-prep/:id')
//   getPrepById(@Param('id') id: string) { return this.service.findPrepPlanById(id); }

//   @Patch('exam-prep/:id')
//   updatePrep(@Param('id') id: string, @Body() dto: Partial<CreateExamPrepDto>) { return this.service.updatePrepPlan(id, dto); }

//   @Delete('exam-prep/:id')
//   deletePrep(@Param('id') id: string) { return this.service.deletePrepPlan(id); }
// }


// src/exam-prep/exam-prep.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExamPrepService } from './exam-prep.service.js';
import { CreateExamPrepDto } from './dto/create-exam-prep.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@ApiTags('Examination Preparation & Past Questions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1')
export class ExamPrepController {
  constructor(private readonly service: ExamPrepService) {}

  // --- Examination Types ---
  @Get('examinations')
  @ApiOperation({
    summary: 'Retrieve all examination boards',
    description: 'Fetch a list of supported standardized examination boards such as WAEC, JAMB, NECO, SAT, etc.'
  })
  getExaminations() { return this.service.findAllExaminations(); }

  @Get('examinations/:id')
  @ApiOperation({
    summary: 'Get examination board by ID',
    description: 'Fetch detailed information regarding a specific standardized examination board.'
  })
  getExaminationById(@Param('id') id: string) { return this.service.findExaminationById(id); }

  // --- Past Questions ---
  @Get('past-questions')
  @ApiOperation({
    summary: 'Retrieve past questions',
    description: 'Fetch past questions with optional query filters such as subject, year, or topic.'
  })
  getPastQuestions(@Query() query: any) { return this.service.findAllPastQuestions(query); }

  @Get('past-questions/years')
  @ApiOperation({
    summary: 'Get distinct past question years',
    description: 'Retrieve a list of all distinct years available in the past questions repository.'
  })
  getYears() { return this.service.getDistinctYears(); }

  @Get('past-questions/subjects')
  @ApiOperation({
    summary: 'Get distinct past question subjects',
    description: 'Retrieve a list of all distinct academic subjects available in the past questions database.'
  })
  getSubjects() { return this.service.getDistinctSubjects(); }

  @Get('past-questions/topics')
  @ApiOperation({
    summary: 'Get distinct past question topics',
    description: 'Retrieve a list of all distinct topics covered across the past questions database.'
  })
  getTopics() { return this.service.getDistinctTopics(); }

  @Get('past-questions/:id')
  @ApiOperation({
    summary: 'Get past question by ID',
    description: 'Fetch a single past question along with its options, correct answers, and detailed explanation.'
  })
  getPastQuestionById(@Param('id') id: string) { return this.service.findPastQuestionById(id); }

  // --- Exam Preparation ---
  @Post('exam-prep')
  @ApiOperation({
    summary: 'Create exam preparation plan',
    description: 'Create a personalized study schedule and target prep plan for an upcoming examination.'
  })
  createPrep(@Body() dto: CreateExamPrepDto) { return this.service.createPrepPlan(dto); }

  @Get('exam-prep')
  @ApiOperation({
    summary: 'Retrieve all exam prep plans',
    description: 'Fetch all saved examination preparation plans for the authenticated user.'
  })
  getPreps() { return this.service.findAllPrepPlans(); }

  @Get('exam-prep/:id')
  @ApiOperation({
    summary: 'Get exam prep plan by ID',
    description: 'Fetch details of a specific examination preparation plan by its unique identifier.'
  })
  getPrepById(@Param('id') id: string) { return this.service.findPrepPlanById(id); }

  @Patch('exam-prep/:id')
  @ApiOperation({
    summary: 'Update exam prep plan',
    description: 'Modify target dates, target subjects, or study layouts for an existing examination preparation plan.'
  })
  updatePrep(@Param('id') id: string, @Body() dto: Partial<CreateExamPrepDto>) { return this.service.updatePrepPlan(id, dto); }

  @Delete('exam-prep/:id')
  @ApiOperation({
    summary: 'Delete exam prep plan',
    description: 'Permanently remove an examination preparation plan from the system.'
  })
  deletePrep(@Param('id') id: string) { return this.service.deletePrepPlan(id); }
}