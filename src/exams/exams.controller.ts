// // src/exams/exams.controller.ts
// import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
// import { ExamsService } from './exams.service.js';
// import { CreateExamDto } from './dto/create-exam.dto.js';
// import { SubmitExamDto } from './dto/submit-exam.dto.js';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

// @UseGuards(JwtAuthGuard)
// @Controller('api/v1/exams')
// export class ExamsController {
//   constructor(private readonly examsService: ExamsService) {}

//   // --- Management ---
//   @Get()
//   findAll() { return this.examsService.findAll(); }

//   @Post()
//   create(@Body() dto: CreateExamDto) { return this.examsService.create(dto); }

//   @Get(':id')
//   findOne(@Param('id') id: string) { return this.examsService.findOne(id); }

//   @Patch(':id')
//   update(@Param('id') id: string, @Body() dto: CreateExamDto) { return this.examsService.update(id, dto); }

//   @Delete(':id')
//   remove(@Param('id') id: string) { return this.examsService.remove(id); }

//   // --- Generation ---
//   @Post('generate')
//   generate(@Body() body: any) { return this.examsService.generateExam(body); }

//   @Post('generate-from-course')
//   generateFromCourse(@Body() body: any) { return this.examsService.generateFromCourse(body); }

//   @Post('generate-from-document')
//   generateFromDocument(@Body() body: any) { return this.examsService.generateFromDocument(body); }

//   // --- Attempts & Grading ---
//   @Post(':id/start')
//   startAttempt(@Param('id') id: string) { return this.examsService.startAttempt(id); }

//   @Post(':id/submit')
//   submitAttempt(@Param('id') id: string, @Body() dto: SubmitExamDto) { return this.examsService.submitAttempt(id, dto); }

//   @Get(':id/result')
//   getResult(@Param('id') id: string) { return this.examsService.getResult(id); }

//   @Get('history')
//   getHistory() { return this.examsService.getHistory(); }

//   @Get('attempts/:id')
//   getSpecificAttempt(@Param('id') id: string) { return this.examsService.getSpecificAttempt(id); }

//   // --- Simulation & Readiness ---
//   @Post(':id/simulate')
//   simulateExam(@Param('id') id: string) { return this.examsService.simulateExam(id); }

//   @Get(':id/readiness')
//   getReadiness(@Param('id') id: string) { return this.examsService.getReadiness(id); }
// }




// // src/exams/exams.controller.ts
// import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
// import { ExamsService } from './exams.service.js';
// import { CreateExamDto } from './dto/create-exam.dto.js';
// import { SubmitExamDto } from './dto/submit-exam.dto.js';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

// @ApiTags('Examinations System')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
// @Controller('api/v1/exams')
// export class ExamsController {
//   constructor(private readonly examsService: ExamsService) {}

//   // --- Management ---
//   @Get()
//   @ApiOperation({
//     summary: 'Retrieve all examinations',
//     description: 'Fetch a list of all formal examinations and timed assessments saved in the system.'
//   })
//   findAll() { return this.examsService.findAll(); }

//   @Post()
//   @ApiOperation({
//     summary: 'Create a new examination',
//     description: 'Manually create and configure a new examination record with questions and duration settings.'
//   })
//   create(@Body() dto: CreateExamDto) { return this.examsService.create(dto); }

//   @Get(':id')
//   @ApiOperation({
//     summary: 'Get examination by ID',
//     description: 'Fetch detailed data for a specific formal examination using its unique identifier.'
//   })
//   findOne(@Param('id') id: string) { return this.examsService.findOne(id); }

//   @Patch(':id')
//   @ApiOperation({
//     summary: 'Update an examination',
//     description: 'Modify title, description, questions, or timing parameters for an existing examination.'
//   })
//   update(@Param('id') id: string, @Body() dto: CreateExamDto) { return this.examsService.update(id, dto); }

//   @Delete(':id')
//   @ApiOperation({
//     summary: 'Delete an examination',
//     description: 'Permanently remove an examination from the database.'
//   })
//   remove(@Param('id') id: string) { return this.examsService.remove(id); }

//   // --- Generation ---
//   @Post('generate')
//   @ApiOperation({
//     summary: 'Generate AI examination',
//     description: 'Trigger the Python AI microservice to dynamically generate an examination based on custom topics and parameters.'
//   })
//   generate(@Body() body: any) { return this.examsService.generateExam(body); }

//   @Post('generate-from-course')
//   @ApiOperation({
//     summary: 'Generate exam from course',
//     description: 'Trigger AI generation to build a comprehensive examination tailored to an existing course curriculum.'
//   })
//   generateFromCourse(@Body() body: any) { return this.examsService.generateFromCourse(body); }

//   @Post('generate-from-document')
//   @ApiOperation({
//     summary: 'Generate exam from document',
//     description: 'Trigger AI generation to extract exam questions and psychometric tasks directly from an uploaded document.'
//   })
//   generateFromDocument(@Body() body: any) { return this.examsService.generateFromDocument(body); }

//   // --- Attempts & Grading ---
//   @Post(':id/start')
//   @ApiOperation({
//     summary: 'Start an exam attempt',
//     description: 'Initialize an official proctored examination session and generate a unique attempt session token.'
//   })
//   startAttempt(@Param('id') id: string) { return this.examsService.startAttempt(id); }

//   @Post(':id/submit')
//   @ApiOperation({
//     summary: 'Submit an exam attempt',
//     description: 'Submit student answers for evaluation, calculate scores, and queue the attempt for final grading.'
//   })
//   submitAttempt(@Param('id') id: string, @Body() dto: SubmitExamDto) { return this.examsService.submitAttempt(id, dto); }

//   @Get(':id/result')
//   @ApiOperation({
//     summary: 'Get exam result',
//     description: 'Retrieve comprehensive breakdown of exam performance, scores, and topic mastery results.'
//   })
//   getResult(@Param('id') id: string) { return this.examsService.getResult(id); }

//   @Get('history')
//   @ApiOperation({
//     summary: 'Get student exam history',
//     description: 'Retrieve the history of all official exam attempts taken by the student.'
//   })
//   getHistory() { return this.examsService.getHistory(); }

//   @Get('attempts/:id')
//   @ApiOperation({
//     summary: 'Get specific exam attempt details',
//     description: 'Fetch detailed review logs and question-by-question responses for a specific exam attempt ID.'
//   })
//   getSpecificAttempt(@Param('id') id: string) { return this.examsService.getSpecificAttempt(id); }

//   // --- Simulation & Readiness ---
//   @Post(':id/simulate')
//   @ApiOperation({
//     summary: 'Simulate an examination',
//     description: 'Initialize an AI-driven simulation environment to practice under realistic exam constraints.'
//   })
//   simulateExam(@Param('id') id: string) { return this.examsService.simulateExam(id); }

//   @Get(':id/readiness')
//   @ApiOperation({
//     summary: 'Get exam readiness score',
//     description: 'Calculate and evaluate student preparation metrics to determine readiness for the official exam.'
//   })
//   getReadiness(@Param('id') id: string) { return this.examsService.getReadiness(id); }
// }

// src/exams/exams.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExamsService } from './exams.service.js';
import { CreateExamDto } from './dto/create-exam.dto.js';
import { SubmitExamDto } from './dto/submit-exam.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@ApiTags('Examinations System')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  // --- Management ---
  @Get()
  @ApiOperation({
    summary: 'Retrieve all examinations',
    description: 'Fetch a list of all formal examinations and timed assessments saved in the system.'
  })
  findAll() { return this.examsService.findAll(); }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 5, ttl: 60000 } })
  @Post()
  @ApiOperation({
    summary: 'Create a new examination',
    description: 'Manually create and configure a new examination record with questions and duration settings.'
  })
  create(@Body() dto: CreateExamDto) { return this.examsService.create(dto); }

  @Get(':id')
  @ApiOperation({
    summary: 'Get examination by ID',
    description: 'Fetch detailed data for a specific formal examination using its unique identifier.'
  })
  findOne(@Param('id') id: string) { return this.examsService.findOne(id); }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 10, ttl: 60000 } })
  @Patch(':id')
  @ApiOperation({
    summary: 'Update an examination',
    description: 'Modify title, description, questions, or timing parameters for an existing examination.'
  })
  update(@Param('id') id: string, @Body() dto: CreateExamDto) { return this.examsService.update(id, dto); }

  @Throttle({ short: { limit: 1, ttl: 5000 }, long: { limit: 5, ttl: 60000 } })
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete an examination',
    description: 'Permanently remove an examination from the database.'
  })
  remove(@Param('id') id: string) { return this.examsService.remove(id); }

  // --- Generation ---
  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 10, ttl: 60000 } })
  @Post('generate')
  @ApiOperation({
    summary: 'Generate AI examination',
    description: 'Trigger the Python AI microservice to dynamically generate an examination based on custom topics and parameters.'
  })
  generate(@Body() body: any) { return this.examsService.generateExam(body); }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 10, ttl: 60000 } })
  @Post('generate-from-course')
  @ApiOperation({
    summary: 'Generate exam from course',
    description: 'Trigger AI generation to build a comprehensive examination tailored to an existing course curriculum.'
  })
  generateFromCourse(@Body() body: any) { return this.examsService.generateFromCourse(body); }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 10, ttl: 60000 } })
  @Post('generate-from-document')
  @ApiOperation({
    summary: 'Generate exam from document',
    description: 'Trigger AI generation to extract exam questions and psychometric tasks directly from an uploaded document.'
  })
  generateFromDocument(@Body() body: any) { return this.examsService.generateFromDocument(body); }

  // --- Attempts & Grading ---
  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 15, ttl: 60000 } })
  @Post(':id/start')
  @ApiOperation({
    summary: 'Start an exam attempt',
    description: 'Initialize an official proctored examination session and generate a unique attempt session token.'
  })
  startAttempt(@Param('id') id: string) { return this.examsService.startAttempt(id); }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 10, ttl: 60000 } })
  @Post(':id/submit')
  @ApiOperation({
    summary: 'Submit an exam attempt',
    description: 'Submit student answers for evaluation, calculate scores, and queue the attempt for final grading.'
  })
  submitAttempt(@Param('id') id: string, @Body() dto: SubmitExamDto) { return this.examsService.submitAttempt(id, dto); }

  @Get(':id/result')
  @ApiOperation({
    summary: 'Get exam result',
    description: 'Retrieve comprehensive breakdown of exam performance, scores, and topic mastery results.'
  })
  getResult(@Param('id') id: string) { return this.examsService.getResult(id); }

  @Get('history')
  @ApiOperation({
    summary: 'Get student exam history',
    description: 'Retrieve the history of all official exam attempts taken by the student.'
  })
  getHistory() { return this.examsService.getHistory(); }

  @Get('attempts/:id')
  @ApiOperation({
    summary: 'Get specific exam attempt details',
    description: 'Fetch detailed review logs and question-by-question responses for a specific exam attempt ID.'
  })
  getSpecificAttempt(@Param('id') id: string) { return this.examsService.getSpecificAttempt(id); }

  // --- Simulation & Readiness ---
  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 10, ttl: 60000 } })
  @Post(':id/simulate')
  @ApiOperation({
    summary: 'Simulate an examination',
    description: 'Initialize an AI-driven simulation environment to practice under realistic exam constraints.'
  })
  simulateExam(@Param('id') id: string) { return this.examsService.simulateExam(id); }

  @Get(':id/readiness')
  @ApiOperation({
    summary: 'Get exam readiness score',
    description: 'Calculate and evaluate student preparation metrics to determine readiness for the official exam.'
  })
  getReadiness(@Param('id') id: string) { return this.examsService.getReadiness(id); }
}