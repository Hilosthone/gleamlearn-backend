// src/ai/ai.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { GenerateAiDto } from './dto/generate-ai.dto.js';

@Injectable()
export class AiService {
  private pythonAiUrl: string;
  private aiApiKey: string;

  constructor(private readonly configService: ConfigService) {
    // 1. Fetch the Python microservice URL and shared secret token from environment variables
    this.pythonAiUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://127.0.0.1:8000');
    this.aiApiKey = this.configService.get<string>('AI_API_KEY', 'your_secret_token');
  }

  /**
   * Helper method to handle communication with the Python microservice.
   * Why it's needed: Centralizes HTTP request logic, headers, and error handling so we don't repeat code.
   */
  private async callPythonAi(endpoint: string, payload?: GenerateAiDto) {
    try {
      const response = await axios.post(`${this.pythonAiUrl}${endpoint}`, payload || {}, {
        headers: {
          Authorization: `Bearer ${this.aiApiKey}`,
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error: any) {
      // Forward any error details coming back from the Python service cleanly to NestJS callers
      throw new HttpException(
        error.response?.data?.detail || 'Failed to communicate with Python AI microservice',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // --- Document & AI Generation Methods mapped to your Controller ---

  async analyzeDocument(id: string, dto?: GenerateAiDto) {
    return this.callPythonAi(`/api/v1/documents/${id}/analyze`, dto);
  }

  async getAnalysis(id: string) {
    // Note: GET requests use axios.get instead of post
    try {
      const response = await axios.get(`${this.pythonAiUrl}/api/v1/documents/${id}/analysis`, {
        headers: { Authorization: `Bearer ${this.aiApiKey}` },
      });
      return response.data;
    } catch (error: any) {
      throw new HttpException(
        error.response?.data?.detail || 'Failed to fetch analysis',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async generateNotes(id: string, dto?: GenerateAiDto) {
    return this.callPythonAi(`/api/v1/documents/${id}/generate-notes`, dto);
  }

  async generateSummary(id: string, dto?: GenerateAiDto) {
    return this.callPythonAi(`/api/v1/documents/${id}/generate-summary`, dto);
  }

  async generateFlashcards(id: string, dto?: GenerateAiDto) {
    return this.callPythonAi(`/api/v1/documents/${id}/generate-flashcards`, dto);
  }

  async generateQuestions(id: string, dto?: GenerateAiDto) {
    return this.callPythonAi(`/api/v1/documents/${id}/generate-questions`, dto);
  }

  async generateQuiz(id: string, dto?: GenerateAiDto) {
    return this.callPythonAi(`/api/v1/documents/${id}/generate-quiz`, dto);
  }

  async generateTest(id: string, dto?: GenerateAiDto) {
    return this.callPythonAi(`/api/v1/documents/${id}/generate-test`, dto);
  }

  async generateExam(id: string, dto?: GenerateAiDto) {
    return this.callPythonAi(`/api/v1/documents/${id}/generate-exam`, dto);
  }

  async createCourseFromDocument(id: string, dto?: GenerateAiDto) {
    return this.callPythonAi(`/api/v1/documents/${id}/create-course`, dto);
  }

  async getAllGeneratedContent(id: string) {
    try {
      const response = await axios.get(`${this.pythonAiUrl}/api/v1/documents/${id}/generated-content`, {
        headers: { Authorization: `Bearer ${this.aiApiKey}` },
      });
      return response.data;
    } catch (error: any) {
      throw new HttpException(
        error.response?.data?.detail || 'Failed to fetch generated content',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async generateLiveClass(id: string, dto?: GenerateAiDto) {
    return this.callPythonAi(`/api/v1/documents/${id}/generate-live-class`, dto);
  }

  async getLiveClassStream(id: string) {
    try {
      const response = await axios.get(`${this.pythonAiUrl}/api/v1/documents/${id}/live-class-stream`, {
        headers: { Authorization: `Bearer ${this.aiApiKey}` },
      });
      return response.data;
    } catch (error: any) {
      throw new HttpException(
        error.response?.data?.detail || 'Failed to stream live class',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async exportPdf(id: string, dto?: GenerateAiDto) {
    return this.callPythonAi(`/api/v1/documents/${id}/export-pdf`, dto);
  }
}