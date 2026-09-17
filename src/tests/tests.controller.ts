// // src/tests/tests.controller.ts
// import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
// import { TestsService } from './tests.service.js';
// import { CreateTestDto } from './dto/create-test.dto.js';
// import { SubmitTestDto } from './dto/submit-test.dto.js';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

// @UseGuards(JwtAuthGuard)
// @Controller('api/v1/tests')
// export class TestsController {
//   constructor(private readonly testsService: TestsService) {}

//   // --- Test Management ---
//   @Get()
//   findAll() {
//     return this.testsService.findAll();
//   }

//   @Post()
//   create(@Body() createDto: CreateTestDto) {
//     return this.testsService.create(createDto);
//   }

//   @Get(':id')
//   findOne(@Param('id') id: string) {
//     return this.testsService.findOne(id);
//   }

//   @Patch(':id')
//   update(@Param('id') id: string, @Body() updateDto: CreateTestDto) {
//     return this.testsService.update(id, updateDto);
//   }

//   @Delete(':id')
//   remove(@Param('id') id: string) {
//     return this.testsService.remove(id);
//   }

//   // --- Test Generation ---
//   @Post('generate')
//   generate(@Body() body: any) {
//     return this.testsService.generateTest(body);
//   }

//   @Post('generate-from-course')
//   generateFromCourse(@Body() body: any) {
//     return this.testsService.generateFromCourse(body);
//   }

//   @Post('generate-from-document')
//   generateFromDocument(@Body() body: any) {
//     return this.testsService.generateFromDocument(body);
//   }

//   // --- Attempts & Grading ---
//   @Post(':id/start')
//   startAttempt(@Param('id') id: string) {
//     return this.testsService.startAttempt(id);
//   }

//   @Post(':id/submit')
//   submitAttempt(@Param('id') id: string, @Body() submitDto: SubmitTestDto) {
//     return this.testsService.submitAttempt(id, submitDto);
//   }

//   @Get(':id/results')
//   getResults(@Param('id') id: string) {
//     return this.testsService.getResults(id);
//   }

//   @Get('attempts')
//   getUserAttempts() {
//     return this.testsService.getUserAttempts();
//   }

//   @Get('attempts/:id')
//   getSpecificAttempt(@Param('id') id: string) {
//     return this.testsService.getSpecificAttempt(id);
//   }
// }


// src/tests/tests.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TestsService } from './tests.service.js';
import { CreateTestDto } from './dto/create-test.dto.js';
import { SubmitTestDto } from './dto/submit-test.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@ApiTags('Tests & Assessments System')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/tests')
export class TestsController {
  constructor(private readonly testsService: TestsService) {}

  // --- Test Management ---
  @Get()
  @ApiOperation({
    summary: 'Retrieve all tests',
    description: 'Fetch a list of all tests saved and configured in the platform.'
  })
  findAll() {
    return this.testsService.findAll();
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new test',
    description: 'Manually create and store a new test entity with custom settings and parameters.'
  })
  create(@Body() createDto: CreateTestDto) {
    return this.testsService.create(createDto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get test by ID',
    description: 'Fetch detailed data and questions for a specific test using its unique identifier.'
  })
  findOne(@Param('id') id: string) {
    return this.testsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a test',
    description: 'Modify title, description, or questions for an existing test.'
  })
  update(@Param('id') id: string, @Body() updateDto: CreateTestDto) {
    return this.testsService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a test',
    description: 'Permanently remove a test from the system database.'
  })
  remove(@Param('id') id: string) {
    return this.testsService.remove(id);
  }

  // --- Test Generation ---
  @Post('generate')
  @ApiOperation({
    summary: 'Generate AI test',
    description: 'Trigger the Python AI microservice to dynamically generate test questions based on custom topic prompts.'
  })
  generate(@Body() body: any) {
    return this.testsService.generateTest(body);
  }

  @Post('generate-from-course')
  @ApiOperation({
    summary: 'Generate test from course',
    description: 'Trigger AI test generation tailored directly to an existing course curriculum.'
  })
  generateFromCourse(@Body() body: any) {
    return this.testsService.generateFromCourse(body);
  }

  @Post('generate-from-document')
  @ApiOperation({
    summary: 'Generate test from document',
    description: 'Trigger AI test generation by extracting educational content and questions from an uploaded document.'
  })
  generateFromDocument(@Body() body: any) {
    return this.testsService.generateFromDocument(body);
  }

  // --- Attempts & Grading ---
  @Post(':id/start')
  @ApiOperation({
    summary: 'Start a test attempt',
    description: 'Initialize a new student test session and return a unique attempt token.'
  })
  startAttempt(@Param('id') id: string) {
    return this.testsService.startAttempt(id);
  }

  @Post(':id/submit')
  @ApiOperation({
    summary: 'Submit a test attempt',
    description: 'Submit student answers for a test attempt, grade results, and calculate scores.'
  })
  submitAttempt(@Param('id') id: string, @Body() submitDto: SubmitTestDto) {
    return this.testsService.submitAttempt(id, submitDto);
  }

  @Get(':id/results')
  @ApiOperation({
    summary: 'Get test results',
    description: 'Retrieve detailed scoring breakdown and analytical feedback for a specific test.'
  })
  getResults(@Param('id') id: string) {
    return this.testsService.getResults(id);
  }

  @Get('attempts')
  @ApiOperation({
    summary: 'Get user test attempts',
    description: 'Fetch the complete history of test attempts taken by the authenticated user.'
  })
  getUserAttempts() {
    return this.testsService.getUserAttempts();
  }

  @Get('attempts/:id')
  @ApiOperation({
    summary: 'Get specific test attempt details',
    description: 'Fetch specific itemized logs and answers for a single test attempt ID.'
  })
  getSpecificAttempt(@Param('id') id: string) {
    return this.testsService.getSpecificAttempt(id);
  }
}