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
import { toLearnerAssessment } from '../common/assessment/learner-questions.js';
import { featureUnavailable } from '../common/errors/feature-unavailable.js';
import { gradeQuiz } from '../quizzes/utils/grade-quiz.util.js';

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


  /** Learner view: questions without their answer keys (see common/assessment/learner-questions.ts). */
  async listForLearners() {
    return (await this.findAll()).map((item) => toLearnerAssessment(item));
  }

  async getForLearner(id: string) {
    return toLearnerAssessment(await this.findOne(id));
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
  /** Attempts are not stored: answers are submitted in one request. Was a fake attempt id. */
  async startAttempt(_id: string): Promise<never> {
    throw featureUnavailable('Test attempts', 'answers are submitted directly with POST /tests/{id}/submit, and attempts are not stored');
  }

  /**
   * Grades the submitted answers against the stored answer key (same grader as quizzes). It used to return a fixed
   * score (88.5) whatever was submitted. No XP or coins are awarded for tests, and nothing is stored.
   */
  async submitAttempt(id: string, submitDto: SubmitTestDto) {
    const test = await this.findOne(id);
    const result = gradeQuiz(test.questions, submitDto?.answers);
    return {
      status: 'success',
      testId: id,
      score: result.score,
      totalQuestions: result.totalQuestions,
      gradableQuestions: result.gradableQuestions,
      correctAnswers: result.correctAnswers,
      graded: result.graded,
      gradedAt: new Date().toISOString(),
      message: result.graded
        ? 'Test submitted and graded. The result is not saved.'
        : 'Test submitted, but it has no answer key to grade against.',
    };
  }

  async getResults(_id: string): Promise<never> {
    throw featureUnavailable('Test results', 'Test attempts are not stored yet, so there is no attempt, result or history to return');
  }

  async getUserAttempts(): Promise<never> {
    throw featureUnavailable('Test attempt history', 'Test attempts are not stored yet, so there is no attempt, result or history to return');
  }

  async getSpecificAttempt(_attemptId: string): Promise<never> {
    throw featureUnavailable('Test attempt details', 'Test attempts are not stored yet, so there is no attempt, result or history to return');
  }
}