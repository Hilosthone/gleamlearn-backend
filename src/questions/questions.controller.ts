// // src/questions/questions.controller.ts
// import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
// import { QuestionsService } from './questions.service.js';
// import { CreateQuestionDto, UpdateQuestionDto, QueryQuestionsDto } from './dto/question.dto.js';

// @ApiTags('Questions Bank')
// @ApiBearerAuth()
// @Controller('api/v1/questions')
// export class QuestionsController {
//   constructor(private readonly questionsService: QuestionsService) {}

//   @Post()
//   @ApiOperation({ summary: 'Create a new question in the question bank' })
//   @ApiResponse({ status: 201, description: 'Question created successfully.' })
//   create(@Body() createQuestionDto: CreateQuestionDto) {
//     return this.questionsService.create(createQuestionDto);
//   }

//   @Get()
//   @ApiOperation({ summary: 'Retrieve all questions with optional dynamic filters (courseId, difficulty, type, etc.)' })
//   @ApiResponse({ status: 200, description: 'List of questions retrieved successfully.' })
//   findAll(@Query() queryDto: QueryQuestionsDto) {
//     return this.questionsService.findAll(queryDto);
//   }

//   @Get(':id')
//   @ApiOperation({ summary: 'Get a specific question by ID' })
//   @ApiResponse({ status: 200, description: 'Question found.' })
//   @ApiResponse({ status: 404, description: 'Question not found.' })
//   findOne(@Param('id') id: string) {
//     return this.questionsService.findOne(id);
//   }

//   @Patch(':id')
//   @ApiOperation({ summary: 'Update an existing question' })
//   @ApiResponse({ status: 200, description: 'Question updated successfully.' })
//   update(@Param('id') id: string, @Body() updateQuestionDto: UpdateQuestionDto) {
//     return this.questionsService.update(id, updateQuestionDto);
//   }

//   @Delete(':id')
//   @ApiOperation({ summary: 'Delete a question from the question bank' })
//   @ApiResponse({ status: 200, description: 'Question deleted successfully.' })
//   remove(@Param('id') id: string) {
//     return this.questionsService.remove(id);
//   }
// }


// src/questions/questions.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
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

  @Post()
  @ApiOperation({ summary: 'Create a new question in the question bank' })
  @ApiResponse({ status: 201, description: 'Question created successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  create(@Body() createQuestionDto: CreateQuestionDto) {
    return this.questionsService.create(createQuestionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all questions with optional dynamic filters (courseId, difficulty, type, etc.)' })
  @ApiResponse({ status: 200, description: 'List of questions retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findAll(@Query() queryDto: QueryQuestionsDto) {
    return this.questionsService.findAll(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific question by ID' })
  @ApiResponse({ status: 200, description: 'Question found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Question not found.' })
  findOne(@Param('id') id: string) {
    return this.questionsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing question' })
  @ApiResponse({ status: 200, description: 'Question updated successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  update(@Param('id') id: string, @Body() updateQuestionDto: UpdateQuestionDto) {
    return this.questionsService.update(id, updateQuestionDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a question from the question bank' })
  @ApiResponse({ status: 200, description: 'Question deleted successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  remove(@Param('id') id: string) {
    return this.questionsService.remove(id);
  }
}