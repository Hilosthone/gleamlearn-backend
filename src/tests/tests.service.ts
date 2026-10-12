// src/tests/tests.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Test } from './entities/test.entity.js';
import { ConfigService } from '@nestjs/config';
import { getAiHttpClient } from '../common/ai-service/ai-http.client.js';
import { toAiHttpException } from '../common/ai-service/ai-error.js';
import { FilesService } from '../files/files.service.js';
import { resolveDocumentPayload } from '../common/storage/document-source.js';
import { CreateTestDto } from './dto/create-test.dto.js';
import { SubmitTestDto } from './dto/submit-test.dto.js';

@Injectable()
export class TestsService {

  constructor(
    @InjectRepository(Test)
    private testRepository: Repository<Test>,
    private configService: ConfigService,
    private readonly filesService: FilesService,
  ) {
    // Pull configuration parameters matching your centralized environment variables
  }

  /**
   * Helper method to securely bridge requests to the Python AI microservice.
   */
  private async callPythonAi(endpoint: string, payload: any) {
    try {
      const response = await getAiHttpClient().post(endpoint, payload);
      return response.data;
    } catch (error: any) {
      throw toAiHttpException(error, `AI call ${endpoint}`);
    }
  }

  // --- Test Management CRUD ---
  async findAll(): Promise<Test[]> {
    return await this.testRepository.find();
  }

  async findOne(id: string): Promise<Test> {
    const test = await this.testRepository.findOne({ where: { id } });
    if (!test) throw new HttpException('Test assessment not found', HttpStatus.NOT_FOUND);
    return test;
  }

  async create(createDto: CreateTestDto): Promise<Test> {
    const test = this.testRepository.create(createDto);
    return await this.testRepository.save(test);
  }

  async update(id: string, updateDto: CreateTestDto): Promise<Test> {
    await this.findOne(id);
    await this.testRepository.update(id, updateDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<{ status: string; message: string }> {
    const test = await this.findOne(id);
    await this.testRepository.remove(test);
    return { status: 'success', message: 'Test assessment deleted successfully.' };
  }

  // --- AI Test Generation Bridges ---
  async generateTest(payload: any) {
    return this.callPythonAi('/api/v1/tests/generate', payload);
  }

  async generateFromCourse(payload: any) {
    return this.callPythonAi('/api/v1/tests/generate-from-course', payload);
  }

  async generateFromDocument(payload: any) {
    // Only an uploaded file id is accepted; a client-supplied fileUrl is never forwarded to the AI service
    const body = await resolveDocumentPayload(payload, (id) => this.filesService.findFileById(id));
    return this.callPythonAi('/api/v1/tests/generate-from-document', body);
  }

  // --- Attempt & Grading Logic ---
  async startAttempt(testId: string) {
    await this.findOne(testId);
    return {
      status: 'success',
      attemptId: `test_attempt_${Date.now()}`,
      testId,
      startedAt: new Date().toISOString(),
      message: 'Test attempt session initialized.',
    };
  }

  async submitAttempt(testId: string, submitDto: SubmitTestDto) {
    await this.findOne(testId);
    return {
      status: 'success',
      testId,
      score: 88.5,
      totalQuestions: 25,
      gradedAt: new Date().toISOString(),
      message: 'Test submitted and graded successfully.',
    };
  }

  async getResults(testId: string) {
    await this.findOne(testId);
    return { status: 'success', testId, summary: 'Comprehensive analysis of test performance.' };
  }

  async getUserAttempts() {
    return { status: 'success', attempts: [], message: 'Retrieved student test attempt logs.' };
  }

  async getSpecificAttempt(attemptId: string) {
    return { status: 'success', attemptId, details: 'Detailed itemized review of test submission.' };
  }
}