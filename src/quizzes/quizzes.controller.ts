// // src/quizzes/quizzes.controller.ts
// import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
// import { QuizzesService } from './quizzes.service.js';

// @Controller('api/v1/quizzes')
// export class QuizzesController {
//   constructor(private readonly quizzesService: QuizzesService) {}

//   // --- Quiz Management ---
//   @Get()
//   findAll() {
//     return this.quizzesService.findAll();
//   }

//   @Post()
//   create(@Body() body: any) {
//     return this.quizzesService.create(body);
//   }

//   @Get(':id')
//   findOne(@Param('id') id: string) {
//     return this.quizzesService.findOne(id);
//   }

//   @Patch(':id')
//   update(@Param('id') id: string, @Body() body: any) {
//     return this.quizzesService.update(id, body);
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
//   submitAttempt(@Param('id') id: string, @Body() body: any) {
//     return this.quizzesService.submitAttempt(id, body);
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
import { QuizzesService } from './quizzes.service.js';
import { CreateQuizDto } from './dto/create-quiz.dto.js';
import { SubmitQuizDto } from './dto/submit-quiz.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard) // Protects all routes in this controller with JWT authentication
@Controller('api/v1/quizzes')
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  // --- Quiz Management ---
  @Get()
  findAll() {
    return this.quizzesService.findAll();
  }

  @Post()
  create(@Body() createQuizDto: CreateQuizDto) {
    return this.quizzesService.create(createQuizDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.quizzesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateQuizDto: CreateQuizDto) {
    return this.quizzesService.update(id, updateQuizDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.quizzesService.remove(id);
  }

  // --- Quiz Generation Pipelines ---
  @Post('generate')
  generate(@Body() body: any) {
    return this.quizzesService.generateQuiz(body);
  }

  @Post('generate-from-course')
  generateFromCourse(@Body() body: any) {
    return this.quizzesService.generateFromCourse(body);
  }

  @Post('generate-from-document')
  generateFromDocument(@Body() body: any) {
    return this.quizzesService.generateFromDocument(body);
  }

  @Post('generate-from-topic')
  generateFromTopic(@Body() body: any) {
    return this.quizzesService.generateFromTopic(body);
  }

  // --- Quiz Attempt & Grading ---
  @Post(':id/start')
  startAttempt(@Param('id') id: string) {
    return this.quizzesService.startAttempt(id);
  }

  @Post(':id/submit')
  submitAttempt(@Param('id') id: string, @Body() submitQuizDto: SubmitQuizDto) {
    return this.quizzesService.submitAttempt(id, submitQuizDto);
  }

  @Get(':id/results')
  getResults(@Param('id') id: string) {
    return this.quizzesService.getResults(id);
  }

  @Get('attempts')
  getUserAttempts() {
    return this.quizzesService.getUserAttempts();
  }

  @Get('attempts/:id')
  getSpecificAttempt(@Param('id') id: string) {
    return this.quizzesService.getSpecificAttempt(id);
  }
}