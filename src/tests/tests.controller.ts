// src/tests/tests.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { TestsService } from './tests.service.js';
import { CreateTestDto } from './dto/create-test.dto.js';
import { SubmitTestDto } from './dto/submit-test.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard)
@Controller('api/v1/tests')
export class TestsController {
  constructor(private readonly testsService: TestsService) {}

  // --- Test Management ---
  @Get()
  findAll() {
    return this.testsService.findAll();
  }

  @Post()
  create(@Body() createDto: CreateTestDto) {
    return this.testsService.create(createDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.testsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: CreateTestDto) {
    return this.testsService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.testsService.remove(id);
  }

  // --- Test Generation ---
  @Post('generate')
  generate(@Body() body: any) {
    return this.testsService.generateTest(body);
  }

  @Post('generate-from-course')
  generateFromCourse(@Body() body: any) {
    return this.testsService.generateFromCourse(body);
  }

  @Post('generate-from-document')
  generateFromDocument(@Body() body: any) {
    return this.testsService.generateFromDocument(body);
  }

  // --- Attempts & Grading ---
  @Post(':id/start')
  startAttempt(@Param('id') id: string) {
    return this.testsService.startAttempt(id);
  }

  @Post(':id/submit')
  submitAttempt(@Param('id') id: string, @Body() submitDto: SubmitTestDto) {
    return this.testsService.submitAttempt(id, submitDto);
  }

  @Get(':id/results')
  getResults(@Param('id') id: string) {
    return this.testsService.getResults(id);
  }

  @Get('attempts')
  getUserAttempts() {
    return this.testsService.getUserAttempts();
  }

  @Get('attempts/:id')
  getSpecificAttempt(@Param('id') id: string) {
    return this.testsService.getSpecificAttempt(id);
  }
}