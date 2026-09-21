// // src/questions/questions.controller.ts
// import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
// import { QuestionsService } from './questions.service.js';
// import { CreateQuestionDto, UpdateQuestionDto, QueryQuestionsDto } from './dto/question.dto.js';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

// @ApiTags('Questions Bank')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
// @Controller('api/v1/questions')
// export class QuestionsController {
//   constructor(private readonly questionsService: QuestionsService) {}

//   @Post()
//   @ApiOperation({ summary: 'Create a new question in the question bank' })
//   @ApiResponse({ status: 201, description: 'Question created successfully.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   create(@Body() createQuestionDto: CreateQuestionDto) {
//     return this.questionsService.create(createQuestionDto);
//   }

//   @Get()
//   @ApiOperation({ summary: 'Retrieve all questions with optional dynamic filters (courseId, difficulty, type, etc.)' })
//   @ApiResponse({ status: 200, description: 'List of questions retrieved successfully.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   findAll(@Query() queryDto: QueryQuestionsDto) {
//     return this.questionsService.findAll(queryDto);
//   }

//   @Get(':id')
//   @ApiOperation({ summary: 'Get a specific question by ID' })
//   @ApiResponse({ status: 200, description: 'Question found.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   @ApiResponse({ status: 404, description: 'Question not found.' })
//   findOne(@Param('id') id: string) {
//     return this.questionsService.findOne(id);
//   }

//   @Patch(':id')
//   @ApiOperation({ summary: 'Update an existing question' })
//   @ApiResponse({ status: 200, description: 'Question updated successfully.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   update(@Param('id') id: string, @Body() updateQuestionDto: UpdateQuestionDto) {
//     return this.questionsService.update(id, updateQuestionDto);
//   }

//   @Delete(':id')
//   @ApiOperation({ summary: 'Delete a question from the question bank' })
//   @ApiResponse({ status: 200, description: 'Question deleted successfully.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   remove(@Param('id') id: string) {
//     return this.questionsService.remove(id);
//   }
// }





// // src/questions/questions.controller.ts
// import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
// import { QuestionsService } from './questions.service.js';
// import { CreateQuestionDto, UpdateQuestionDto, QueryQuestionsDto } from './dto/question.dto.js';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

// @ApiTags('Questions Bank')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
// @Controller('api/v1/questions')
// export class QuestionsController {
//   constructor(private readonly questionsService: QuestionsService) {}

//   @Post()
//   @ApiOperation({ 
//     summary: 'Create a new question', 
//     description: 'Creates and stores a new question record in the main question bank along with options, correct answers, and difficulty levels.' 
//   })
//   @ApiResponse({ status: 201, description: 'Question created successfully.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   create(@Body() createQuestionDto: CreateQuestionDto) {
//     return this.questionsService.create(createQuestionDto);
//   }

//   @Get()
//   @ApiOperation({ 
//     summary: 'Retrieve all questions', 
//     description: 'Retrieves all questions from the question bank with optional dynamic filters such as courseId, difficulty, topic, or question type.' 
//   })
//   @ApiResponse({ status: 200, description: 'List of questions retrieved successfully.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   findAll(@Query() queryDto: QueryQuestionsDto) {
//     return this.questionsService.findAll(queryDto);
//   }

//   @Get(':id')
//   @ApiOperation({ 
//     summary: 'Get a specific question by ID', 
//     description: 'Fetches full details and configuration for a single question using its unique identifier.' 
//   })
//   @ApiResponse({ status: 200, description: 'Question found.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   @ApiResponse({ status: 404, description: 'Question not found.' })
//   findOne(@Param('id') id: string) {
//     return this.questionsService.findOne(id);
//   }

//   @Patch(':id')
//   @ApiOperation({ 
//     summary: 'Update an existing question', 
//     description: 'Modifies specific fields, correct options, or explanation metadata of an existing question.' 
//   })
//   @ApiResponse({ status: 200, description: 'Question updated successfully.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   update(@Param('id') id: string, @Body() updateQuestionDto: UpdateQuestionDto) {
//     return this.questionsService.update(id, updateQuestionDto);
//   }

//   @Delete(':id')
//   @ApiOperation({ 
//     summary: 'Delete a question', 
//     description: 'Permanently removes a question entity from the question bank.' 
//   })
//   @ApiResponse({ status: 200, description: 'Question deleted successfully.' })
//   @ApiResponse({ status: 401, description: 'Unauthorized.' })
//   remove(@Param('id') id: string) {
//     return this.questionsService.remove(id);
//   }
// }


// src/questions/questions.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { QuestionsService } from './questions.service.js';
import { CreateQuestionDto, UpdateQuestionDto, QueryQuestionsDto } from './dto/question.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@ApiTags('Questions Bank')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 10, ttl: 60000 } })
  @Post()
  @ApiOperation({ 
    summary: 'Create a new question', 
    description: 'Creates and stores a new question record in the main question bank along with options, correct answers, and difficulty levels.' 
  })
  @ApiResponse({ status: 201, description: 'Question created successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  create(@Body() createQuestionDto: CreateQuestionDto) {
    return this.questionsService.create(createQuestionDto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Retrieve all questions', 
    description: 'Retrieves all questions from the question bank with optional dynamic filters such as courseId, difficulty, topic, or question type.' 
  })
  @ApiResponse({ status: 200, description: 'List of questions retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findAll(@Query() queryDto: QueryQuestionsDto) {
    return this.questionsService.findAll(queryDto);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get a specific question by ID', 
    description: 'Fetches full details and configuration for a single question using its unique identifier.' 
  })
  @ApiResponse({ status: 200, description: 'Question found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Question not found.' })
  findOne(@Param('id') id: string) {
    return this.questionsService.findOne(id);
  }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 10, ttl: 60000 } })
  @Patch(':id')
  @ApiOperation({ 
    summary: 'Update an existing question', 
    description: 'Modifies specific fields, correct options, or explanation metadata of an existing question.' 
  })
  @ApiResponse({ status: 200, description: 'Question updated successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  update(@Param('id') id: string, @Body() updateQuestionDto: UpdateQuestionDto) {
    return this.questionsService.update(id, updateQuestionDto);
  }

  @Throttle({ short: { limit: 1, ttl: 5000 }, long: { limit: 5, ttl: 60000 } })
  @Delete(':id')
  @ApiOperation({ 
    summary: 'Delete a question', 
    description: 'Permanently removes a question entity from the question bank.' 
  })
  @ApiResponse({ status: 200, description: 'Question deleted successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  remove(@Param('id') id: string) {
    return this.questionsService.remove(id);
  }
}