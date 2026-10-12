// src/ai/ai.service.ts
import { Injectable } from '@nestjs/common';
import { FilesService } from '../files/files.service.js';
import { getAiHttpClient } from '../common/ai-service/ai-http.client.js';
import { assertTrustedStoredFile } from '../common/storage/document-source.js';
import { toAiHttpException } from '../common/ai-service/ai-error.js';
import { GenerateAiDto } from './dto/generate-ai.dto.js';

@Injectable()
export class AiService {
  constructor(private readonly filesService: FilesService) {}

  /**
   * Helper method to handle communication with the Python microservice.
   * Why it's needed: Centralizes HTTP request logic, headers, and error handling so we don't repeat code.
   */
  private async callPythonAi(endpoint: string, payload?: unknown) {
    try {
      const response = await getAiHttpClient().post(endpoint, payload || {});
      return response.data;
    } catch (error: any) {
      // Forward any error details coming back from the Python service cleanly to NestJS callers
      throw toAiHttpException(error, `AI document call ${endpoint}`);
    }
  }

  private async getPythonAi(endpoint: string, failureMessage: string) {
    try {
      const response = await getAiHttpClient().get(endpoint);
      return response.data;
    } catch (error: any) {
      throw toAiHttpException(error, `AI document call ${endpoint} (${failureMessage})`);
    }
  }

  /**
   * Generation endpoints on the AI service require the stored file's id and URL (AiRequest schema).
   * The client-supplied generation options are forwarded under `options`.
   */
  private async callDocumentPipeline(id: string, action: string, dto?: GenerateAiDto) {
    const file = await this.filesService.findFileById(id);
    // Defense in depth: never ask the AI service to fetch a URL outside the project's own storage
    assertTrustedStoredFile(file);
    return this.callPythonAi(`/api/v1/ai/documents/${encodeURIComponent(id)}/${action}`, {
      fileId: file.id,
      fileUrl: file.url,
      options: dto ?? {},
    });
  }

  // --- Document & AI Generation Methods mapped to your Controller ---

  async analyzeDocument(id: string, dto?: GenerateAiDto) {
    return this.callDocumentPipeline(id, 'analyze', dto);
  }

  async getAnalysis(id: string) {
    return this.getPythonAi(`/api/v1/ai/documents/${encodeURIComponent(id)}/analysis`, 'Failed to fetch analysis');
  }

  async generateNotes(id: string, dto?: GenerateAiDto) {
    return this.callDocumentPipeline(id, 'generate-notes', dto);
  }

  async generateSummary(id: string, dto?: GenerateAiDto) {
    return this.callDocumentPipeline(id, 'generate-summary', dto);
  }

  async generateFlashcards(id: string, dto?: GenerateAiDto) {
    return this.callDocumentPipeline(id, 'generate-flashcards', dto);
  }

  async generateQuestions(id: string, dto?: GenerateAiDto) {
    return this.callDocumentPipeline(id, 'generate-questions', dto);
  }

  async generateQuiz(id: string, dto?: GenerateAiDto) {
    return this.callDocumentPipeline(id, 'generate-quiz', dto);
  }

  async generateTest(id: string, dto?: GenerateAiDto) {
    return this.callDocumentPipeline(id, 'generate-test', dto);
  }

  async generateExam(id: string, dto?: GenerateAiDto) {
    return this.callDocumentPipeline(id, 'generate-exam', dto);
  }

  async createCourseFromDocument(id: string, dto?: GenerateAiDto) {
    return this.callDocumentPipeline(id, 'create-course', dto);
  }

  async getAllGeneratedContent(id: string) {
    return this.getPythonAi(`/api/v1/ai/documents/${encodeURIComponent(id)}/generated-content`, 'Failed to fetch generated content');
  }

  async generateLiveClass(id: string, dto?: GenerateAiDto) {
    return this.callDocumentPipeline(id, 'generate-live-class', dto);
  }

  async getLiveClassStream(id: string) {
    return this.getPythonAi(`/api/v1/ai/documents/${encodeURIComponent(id)}/live-class-stream`, 'Failed to stream live class');
  }

  async exportPdf(id: string, dto?: GenerateAiDto) {
    return this.callDocumentPipeline(id, 'export-pdf', dto);
  }
}