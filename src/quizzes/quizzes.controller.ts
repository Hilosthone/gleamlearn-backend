// // src/quizzes/quizzes.controller.ts
// import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
// import { QuizzesService } from './quizzes.service.js';
// import { CreateQuizDto } from './dto/create-quiz.dto.js';
// import { SubmitQuizDto } from './dto/submit-quiz.dto.js';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

// @UseGuards(JwtAuthGuard) // Protects all routes in this controller with JWT authentication
// @Controller('api/v1/quizzes')
// export class QuizzesController {
//   constructor(private readonly quizzesService: QuizzesService) {}

//   // --- Quiz Management ---
//   @Get()
//   findAll() {
//     return this.quizzesService.findAll();
//   }

//   @Post()
//   create(@Body() createQuizDto: CreateQuizDto) {
//     return this.quizzesService.create(createQuizDto);
//   }

//   @Get(':id')
//   findOne(@Param('id') id: string) {
//     return this.quizzesService.findOne(id);
//   }

//   @Patch(':id')
//   update(@Param('id') id: string, @Body() updateQuizDto: CreateQuizDto) {
//     return this.quizzesService.update(id, updateQuizDto);
//   }

//   @Delete(':id')
//   remove(@Param('id') id: string) {
//     return this.quizzesService.remove(id);
//   }

//   // --- Quiz Generation Pipelines ---
//   @Post('generate')
//   generate(@Body() body: any) {
//     return this.quizzesService.generateQuiz(body);
//   }

//   @Post('generate-from-course')
//   generateFromCourse(@Body() body: any) {
//     return this.quizzesService.generateFromCourse(body);
//   }

//   @Post('generate-from-document')
//   generateFromDocument(@Body() body: any) {
//     return this.quizzesService.generateFromDocument(body);
//   }

//   @Post('generate-from-topic')
//   generateFromTopic(@Body() body: any) {
//     return this.quizzesService.generateFromTopic(body);
//   }

//   // --- Quiz Attempt & Grading ---
//   @Post(':id/start')
//   startAttempt(@Param('id') id: string) {
//     return this.quizzesService.startAttempt(id);
//   }

//   @Post(':id/submit')
//   submitAttempt(@Param('id') id: string, @Body() submitQuizDto: SubmitQuizDto) {
//     return this.quizzesService.submitAttempt(id, submitQuizDto);
//   }

//   @Get(':id/results')
//   getResults(@Param('id') id: string) {
//     return this.quizzesService.getResults(id);
//   }

//   @Get('attempts')
//   getUserAttempts() {
//     return this.quizzesService.getUserAttempts();
//   }

//   @Get('attempts/:id')
//   getSpecificAttempt(@Param('id') id: string) {
//     return this.quizzesService.getSpecificAttempt(id);
//   }
// }





// src/quizzes/quizzes.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { QuizzesService } from './quizzes.service.js';
import { CreateQuizDto } from './dto/create-quiz.dto.js';
import { SubmitQuizDto } from './dto/submit-quiz.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@ApiTags('Quizzes System')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/quizzes')
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  // --- Quiz Management ---
  @Get()
  @ApiOperation({
    summary: 'Retrieve all quizzes',
    description: 'Fetch a complete list of all saved quizzes in the system.'
  })
  @ApiResponse({ status: 200, description: 'List of quizzes retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findAll() {
    return this.quizzesService.findAll();
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new quiz',
    description: 'Manually create and store a new quiz entity with questions, choices, and difficulty levels.'
  })
  @ApiResponse({ status: 201, description: 'Quiz created successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  create(@Body() createQuizDto: CreateQuizDto) {
    return this.quizzesService.create(createQuizDto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get quiz by ID',
    description: 'Fetch detailed information and questions for a specific quiz using its unique identifier.'
  })
  @ApiResponse({ status: 200, description: 'Quiz found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Quiz not found.' })
  findOne(@Param('id') id: string) {
    return this.quizzesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a quiz',
    description: 'Modify title, description, questions, or settings for an existing quiz.'
  })
  @ApiResponse({ status: 200, description: 'Quiz updated successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Quiz not found.' })
  update(@Param('id') id: string, @Body() updateQuizDto: CreateQuizDto) {
    return this.quizzesService.update(id, updateQuizDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a quiz',
    description: 'Permanently remove a quiz from the system database.'
  })
  @ApiResponse({ status: 200, description: 'Quiz deleted successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Quiz not found.' })
  remove(@Param('id') id: string) {
    return this.quizzesService.remove(id);
  }

  // --- Quiz Generation Pipelines ---
  @Post('generate')
  @ApiOperation({
    summary: 'Generate AI quiz',
    description: 'Trigger the Python AI microservice to dynamically generate quiz questions based on custom parameters.'
  })
  @ApiResponse({ status: 201, description: 'Quiz generated successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  generate(@Body() body: any) {
    return this.quizzesService.generateQuiz(body);
  }

  @Post('generate-from-course')
  @ApiOperation({
    summary: 'Generate quiz from course',
    description: 'Trigger AI quiz generation tailored directly to an existing course curriculum.'
  })
  @ApiResponse({ status: 201, description: 'Course-based quiz generated successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  generateFromCourse(@Body() body: any) {
    return this.quizzesService.generateFromCourse(body);
  }

  @Post('generate-from-document')
  @ApiOperation({
    summary: 'Generate quiz from document',
    description: 'Trigger AI quiz generation by parsing content from an uploaded document.'
  })
  @ApiResponse({ status: 201, description: 'Document-based quiz generated successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  generateFromDocument(@Body() body: any) {
    return this.quizzesService.generateFromDocument(body);
  }

  @Post('generate-from-topic')
  @ApiOperation({
    summary: 'Generate quiz from topic',
    description: 'Trigger AI quiz generation focused on a specific academic or technical topic.'
  })
  @ApiResponse({ status: 201, description: 'Topic-based quiz generated successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  generateFromTopic(@Body() body: any) {
    return this.quizzesService.generateFromTopic(body);
  }

  // --- Quiz Attempt & Grading ---
  @Post(':id/start')
  @ApiOperation({
    summary: 'Start a quiz attempt',
    description: 'Initialize a new student quiz session and generate a unique attempt tracking token.'
  })
  @ApiResponse({ status: 201, description: 'Quiz attempt session initialized.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  startAttempt(@Param('id') id: string) {
    return this.quizzesService.startAttempt(id);
  }

  @Post(':id/submit')
  @ApiOperation({
    summary: 'Submit a quiz attempt',
    description: 'Submit student answers for a quiz attempt, evaluate performance, and calculate overall score.'
  })
  @ApiResponse({ status: 200, description: 'Quiz attempt submitted and graded successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  submitAttempt(@Param('id') id: string, @Body() submitQuizDto: SubmitQuizDto) {
    return this.quizzesService.submitAttempt(id, submitQuizDto);
  }

  @Get(':id/results')
  @ApiOperation({
    summary: 'Get quiz results',
    description: 'Retrieve detailed scoring breakdown, right/wrong answer analysis, and feedback for a quiz.'
  })
  @ApiResponse({ status: 200, description: 'Quiz results fetched successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getResults(@Param('id') id: string) {
    return this.quizzesService.getResults(id);
  }

  @Get('attempts')
  @ApiOperation({
    summary: 'Get user quiz attempts',
    description: 'Fetch the complete history of quiz attempts taken by the authenticated user.'
  })
  @ApiResponse({ status: 200, description: 'User attempt history retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getUserAttempts() {
    return this.quizzesService.getUserAttempts();
  }

  @Get('attempts/:id')
  @ApiOperation({
    summary: 'Get specific quiz attempt details',
    description: 'Fetch detailed responses and score breakdown for a specific attempt ID.'
  })
  @ApiResponse({ status: 200, description: 'Attempt details retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Attempt not found.' })
  getSpecificAttempt(@Param('id') id: string) {
    return this.quizzesService.getSpecificAttempt(id);
  }
}