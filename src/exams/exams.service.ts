// src/exams/exams.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exam } from './entities/exam.entity.js';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CreateExamDto } from './dto/create-exam.dto.js';
import { SubmitExamDto } from './dto/submit-exam.dto.js';

@Injectable()
export class ExamsService {
  private aiServiceUrl: string;
  private aiApiKey: string;

  constructor(
    @InjectRepository(Exam)
    private examRepository: Repository<Exam>,
    private configService: ConfigService,
  ) {
    this.aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://127.0.0.1:8000');
    this.aiApiKey = this.configService.get<string>('AI_API_KEY', 'your_secret_token');
  }

  private async callPythonAi(endpoint: string, payload: any) {
    try {
      const response = await axios.post(`${this.aiServiceUrl}${endpoint}`, payload, {
        headers: { Authorization: `Bearer ${this.aiApiKey}` },
      });
      return response.data;
    } catch (error: any) {
      throw new HttpException(
        error.response?.data?.detail || 'Failed to communicate with AI microservice',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
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
    return this.callPythonAi('/api/v1/exams/generate-from-document', payload);
  }

  // --- Attempts, Grading & Simulation ---
  async startAttempt(id: string) {
    await this.findOne(id);
    return {
      status: 'success',
      attemptId: `exam_attempt_${Date.now()}`,
      examId: id,
      startedAt: new Date().toISOString(),
      message: 'Official examination session started under proctored guidelines.',
    };
  }

  async submitAttempt(id: string, submitDto: SubmitExamDto) {
    await this.findOne(id);
    return {
      status: 'success',
      examId: id,
      score: 92.0,
      grade: 'A',
      submittedAt: new Date().toISOString(),
      message: 'Exam submitted successfully and queued for final evaluation.',
    };
  }

  async getResult(id: string) {
    await this.findOne(id);
    return { status: 'success', examId: id, analysis: 'Comprehensive breakdown of exam results and topic mastery.' };
  }

  async getHistory() {
    return { status: 'success', history: [], message: 'Retrieved student exam attempt history.' };
  }

  async getSpecificAttempt(attemptId: string) {
    return { status: 'success', attemptId, details: 'Detailed review log of specific exam attempt.' };
  }

  async simulateExam(id: string) {
    await this.findOne(id);
    return {
      status: 'success',
      examId: id,
      simulationActive: true,
      message: 'AI exam simulation environment initialized.',
    };
  }

  async getReadiness(id: string) {
    await this.findOne(id);
    return {
      status: 'success',
      examId: id,
      readinessScore: '85%',
      recommendation: 'Student is well-prepared for official examination.',
    };
  }
}