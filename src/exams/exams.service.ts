// src/exams/exams.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exam } from './entities/exam.entity.js';
import { ConfigService } from '@nestjs/config';
import { getAiHttpClient } from '../common/ai-service/ai-http.client.js';
import { toAiHttpException } from '../common/ai-service/ai-error.js';
import { FilesService } from '../files/files.service.js';
import { resolveDocumentPayload } from '../common/storage/document-source.js';
import { CreateExamDto } from './dto/create-exam.dto.js';
import { SubmitExamDto } from './dto/submit-exam.dto.js';
import { toLearnerAssessment } from '../common/assessment/learner-questions.js';
import { featureUnavailable } from '../common/errors/feature-unavailable.js';
import { gradeQuiz } from '../quizzes/utils/grade-quiz.util.js';

@Injectable()
export class ExamsService {

  constructor(
    @InjectRepository(Exam)
    private examRepository: Repository<Exam>,
    private configService: ConfigService,
    private readonly filesService: FilesService,
  ) {
  }

  private async callPythonAi(endpoint: string, payload: any) {
    try {
      const response = await getAiHttpClient().post(endpoint, payload);
      return response.data;
    } catch (error: any) {
      throw toAiHttpException(error, `AI call ${endpoint}`);
    }
  }

  // --- Exam CRUD Management ---
  async findAll(): Promise<Exam[]> {
    return await this.examRepository.find();
  }

  async findOne(id: string): Promise<Exam> {
    const exam = await this.examRepository.findOne({ where: { id } });
    if (!exam) throw new HttpException('Examination not found', HttpStatus.NOT_FOUND);
    return exam;
  }


  /** Learner view: questions without their answer keys (see common/assessment/learner-questions.ts). */
  async listForLearners() {
    return (await this.findAll()).map((item) => toLearnerAssessment(item));
  }

  async getForLearner(id: string) {
    return toLearnerAssessment(await this.findOne(id));
  }

  async create(createDto: CreateExamDto): Promise<Exam> {
    const exam = this.examRepository.create(createDto);
    return await this.examRepository.save(exam);
  }

  async update(id: string, updateDto: CreateExamDto): Promise<Exam> {
    await this.findOne(id);
    await this.examRepository.update(id, updateDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<{ status: string; message: string }> {
    const exam = await this.findOne(id);
    await this.examRepository.remove(exam);
    return { status: 'success', message: 'Examination deleted successfully.' };
  }

  // --- AI Exam Generation Bridges ---
  async generateExam(payload: any) {
    return this.callPythonAi('/api/v1/exams/generate', payload);
  }

  async generateFromCourse(payload: any) {
    return this.callPythonAi('/api/v1/exams/generate-from-course', payload);
  }

  async generateFromDocument(payload: any) {
    // Only an uploaded file id is accepted; a client-supplied fileUrl is never forwarded to the AI service
    const body = await resolveDocumentPayload(payload, (id) => this.filesService.findFileById(id));
    return this.callPythonAi('/api/v1/exams/generate-from-document', body);
  }

  // --- Attempts, Grading & Simulation ---
  /** Attempts are not stored: answers are submitted in one request. Was a fake attempt id. */
  async startAttempt(_id: string): Promise<never> {
    throw featureUnavailable('Exam attempts', 'answers are submitted directly with POST /exams/{id}/submit, and attempts are not stored');
  }

  /**
   * Grades the submitted answers against the stored answer key (same grader as quizzes). It used to return a fixed
   * score (92, grade A) whatever was submitted. No XP or coins are awarded for exams, and nothing is stored.
   */
  async submitAttempt(id: string, submitDto: SubmitExamDto) {
    const exam = await this.findOne(id);
    const result = gradeQuiz(exam.questions, submitDto?.answers);
    return {
      status: 'success',
      examId: id,
      score: result.score,
      totalQuestions: result.totalQuestions,
      gradableQuestions: result.gradableQuestions,
      correctAnswers: result.correctAnswers,
      graded: result.graded,
      gradedAt: new Date().toISOString(),
      message: result.graded
        ? 'Exam submitted and graded. The result is not saved.'
        : 'Exam submitted, but it has no answer key to grade against.',
    };
  }

  async getResult(_id: string): Promise<never> {
    throw featureUnavailable('Exam results', 'Exam attempts are not stored yet, so there is no attempt, result or history to return');
  }

  async getHistory(): Promise<never> {
    throw featureUnavailable('Exam attempt history', 'Exam attempts are not stored yet, so there is no attempt, result or history to return');
  }

  async getSpecificAttempt(_attemptId: string): Promise<never> {
    throw featureUnavailable('Exam attempt details', 'Exam attempts are not stored yet, so there is no attempt, result or history to return');
  }

  /** Was a fake "simulation active" response. */
  async simulateExam(_id: string): Promise<never> {
    throw featureUnavailable('Exam simulation', 'timed exam simulation is not implemented');
  }

  /** Was an invented "85%" readiness score with a fixed recommendation. */
  async getReadiness(_id: string): Promise<never> {
    throw featureUnavailable('Exam readiness', 'readiness is not computed yet (there are no stored attempts to base it on)');
  }
}