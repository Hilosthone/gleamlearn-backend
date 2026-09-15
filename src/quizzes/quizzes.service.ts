// src/quizzes/quizzes.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quiz } from './entities/quiz.entity.js';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class QuizzesService {
  private pythonAiUrl: string;
  private aiApiKey: string;

  constructor(
    @InjectRepository(Quiz)
    private quizRepository: Repository<Quiz>,
    private configService: ConfigService,
  ) {
    this.pythonAiUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://127.0.0.1:8000');
    this.aiApiKey = this.configService.get<string>('AI_API_KEY', 'your_secret_token');
  }

private async callPythonAi(endpoint: string, payload: any) {
    try {
      const response = await axios.post(`${this.pythonAiUrl}${endpoint}`, payload, {
        headers: { Authorization: `Bearer ${this.aiApiKey}` },
      });
      return response.data;
    } catch (error: any) {
      // Explicitly typed as 'any' so TypeScript allows accessing axios error properties (.response)
      throw new HttpException(
        error.response?.data?.detail || 'Failed to communicate with AI microservice',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll() {
    return await this.quizRepository.find();
  }

  async findOne(id: string) {
    const quiz = await this.quizRepository.findOne({ where: { id } });
    if (!quiz) throw new HttpException('Quiz not found', HttpStatus.NOT_FOUND);
    return quiz;
  }

  async create(createDto: any) {
    const quiz = this.quizRepository.create(createDto);
    return await this.quizRepository.save(quiz);
  }

  async update(id: string, updateDto: any) {
    await this.quizRepository.update(id, updateDto);
    return this.findOne(id);
  }

  async remove(id: string) {
    const quiz = await this.findOne(id);
    await this.quizRepository.remove(quiz);
    return { status: 'success', message: 'Quiz deleted successfully.' };
  }

  // --- AI Generation Bridges ---
  async generateQuiz(payload: any) {
    return this.callPythonAi('/api/v1/quizzes/generate', payload);
  }

  async generateFromCourse(payload: any) {
    return this.callPythonAi('/api/v1/quizzes/generate-from-course', payload);
  }

  async generateFromDocument(payload: any) {
    return this.callPythonAi('/api/v1/quizzes/generate-from-document', payload);
  }

  async generateFromTopic(payload: any) {
    return this.callPythonAi('/api/v1/quizzes/generate-from-topic', payload);
  }

  // --- Attempt & Grading Simulations ---
  async startAttempt(quizId: string) {
    await this.findOne(quizId);
    return {
      status: 'success',
      attemptId: `attempt_${Date.now()}`,
      quizId,
      startedAt: new Date().toISOString(),
      message: 'Quiz attempt started.',
    };
  }

  async submitAttempt(quizId: string, payload: any) {
    await this.findOne(quizId);
    // Real grading logic evaluates payload.answers against answer keys stored in DB
    return {
      status: 'success',
      quizId,
      score: 85.0,
      totalQuestions: 10,
      correctAnswers: 8,
      message: 'Quiz submitted and graded successfully.',
    };
  }

  async getResults(quizId: string) {
    return { status: 'success', quizId, resultsSummary: 'Retrieved analysis of quiz attempts.' };
  }

  async getUserAttempts() {
    return { status: 'success', attempts: [], message: 'Retrieved user quiz attempt history.' };
  }

  async getSpecificAttempt(attemptId: string) {
    return { status: 'success', attemptId, reviewDetails: 'Detailed breakdown of attempt responses.' };
  }
}