// // src/ai/ai.service.ts
// import { Injectable, NotFoundException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { ConfigService } from '@nestjs/config';
// import { AiContentEntity } from './entities/ai-content.entity.js';
// import { FilesService } from '../files/files.service.js';
// import { GenerateAiDto } from './dto/generate-ai.dto.js';

// @Injectable()
// export class AiService {
//   private aiServiceUrl: string;
//   private aiApiKey: string;

//   constructor(
//     @InjectRepository(AiContentEntity) private aiContentRepo: Repository<AiContentEntity>,
//     private filesService: FilesService,
//     private configService: ConfigService,
//   ) {
//     this.aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:8000');
//     this.aiApiKey = this.configService.get<string>('AI_API_KEY', '');
//   }

//   private async callFastApi(endpoint: string, fileId: string, dto?: GenerateAiDto, method: string = 'POST', isGet: boolean = false) {
//     const file = await this.filesService.findFileById(fileId);

//     const headers: Record<string, string> = {
//       'Content-Type': 'application/json',
//     };

//     if (this.aiApiKey) {
//       headers['Authorization'] = `Bearer ${this.aiApiKey}`;
//     }

//     try {
//       const url = `${this.aiServiceUrl}/api/v1/${endpoint}`;
//       const options: RequestInit = {
//         method,
//         headers,
//       };

//       if (!isGet) {
//         options.body = JSON.stringify({
//           fileId: file.id,
//           fileUrl: file.url,
//           options: dto || {},
//         });
//       }

//       const response = await fetch(url, options);

//       if (!response.ok) {
//         throw new Error(`FastAPI service error: ${response.statusText}`);
//       }

//       return await response.json();
//     } catch (error: any) {
//       return {
//         warning: 'Connected to mock AI fallback (FastAPI service unreachable)',
//         fileId,
//         endpointCalled: endpoint,
//         optionsProvided: dto || {},
//         processedAt: new Date().toISOString(),
//         result: `Simulated AI generation result for ${endpoint}`,
//       };
//     }
//   }

//   async analyzeDocument(fileId: string, dto?: GenerateAiDto) {
//     const data = await this.callFastApi('ai/documents/' + fileId + '/analyze', fileId, dto);
//     return this.saveOrUpdateContent(fileId, 'ANALYSIS', data);
//   }

//   async getAnalysis(fileId: string) {
//     const data = await this.callFastApi('ai/documents/' + fileId + '/analysis', fileId, undefined, 'GET', true);
//     return data;
//   }

//   async generateNotes(fileId: string, dto?: GenerateAiDto) {
//     const data = await this.callFastApi('ai/documents/' + fileId + '/generate-notes', fileId, dto);
//     return this.saveOrUpdateContent(fileId, 'NOTES', data);
//   }

//   async generateSummary(fileId: string, dto?: GenerateAiDto) {
//     const data = await this.callFastApi('ai/documents/' + fileId + '/generate-summary', fileId, dto);
//     return this.saveOrUpdateContent(fileId, 'SUMMARY', data);
//   }

//   async generateFlashcards(fileId: string, dto?: GenerateAiDto) {
//     const data = await this.callFastApi('ai/documents/' + fileId + '/generate-flashcards', fileId, dto);
//     return this.saveOrUpdateContent(fileId, 'FLASHCARDS', data);
//   }

//   async generateQuestions(fileId: string, dto?: GenerateAiDto) {
//     const data = await this.callFastApi('ai/documents/' + fileId + '/generate-questions', fileId, dto);
//     return this.saveOrUpdateContent(fileId, 'QUESTIONS', data);
//   }

//   async generateQuiz(fileId: string, dto?: GenerateAiDto) {
//     const data = await this.callFastApi('ai/documents/' + fileId + '/generate-quiz', fileId, dto);
//     return this.saveOrUpdateContent(fileId, 'QUIZ', data);
//   }

//   async generateTest(fileId: string, dto?: GenerateAiDto) {
//     const data = await this.callFastApi('ai/documents/' + fileId + '/generate-test', fileId, dto);
//     return this.saveOrUpdateContent(fileId, 'TEST', data);
//   }

//   async generateExam(fileId: string, dto?: GenerateAiDto) {
//     const data = await this.callFastApi('ai/documents/' + fileId + '/generate-exam', fileId, dto);
//     return this.saveOrUpdateContent(fileId, 'EXAM', data);
//   }

//   async createCourseFromDocument(fileId: string, dto?: GenerateAiDto) {
//     const data = await this.callFastApi('ai/documents/' + fileId + '/create-course', fileId, dto);
//     return this.saveOrUpdateContent(fileId, 'COURSE', data);
//   }

//   async getAllGeneratedContent(fileId: string) {
//     return this.aiContentRepo.find({ where: { fileId }, order: { createdAt: 'DESC' } });
//   }

//   // =========================================================================
//   // NEW METHODS: INTERACTIVE LIVE AI CLASS & PDF EXPORT
//   // =========================================================================

//   async generateLiveClass(fileId: string, dto?: GenerateAiDto) {
//     const data = await this.callFastApi(`ai/documents/${fileId}/generate-live-class`, fileId, dto);
//     return this.saveOrUpdateContent(fileId, 'LIVE_CLASS', data);
//   }

//   async getLiveClassStream(fileId: string) {
//     return this.callFastApi(`ai/documents/${fileId}/live-class-stream`, fileId, undefined, 'GET', true);
//   }

//   async exportPdf(fileId: string, dto?: GenerateAiDto) {
//     const data = await this.callFastApi(`ai/documents/${fileId}/export-pdf`, fileId, dto);
//     return this.saveOrUpdateContent(fileId, 'PDF_EXPORT', data);
//   }

//   private async saveOrUpdateContent(fileId: string, contentType: string, payload: any) {
//     let existing = await this.aiContentRepo.findOne({ where: { fileId, contentType } });
//     if (existing) {
//       existing.payload = payload;
//       return this.aiContentRepo.save(existing);
//     }
//     const newRecord = this.aiContentRepo.create({ fileId, contentType, payload });
//     return this.aiContentRepo.save(newRecord);
//   }

//   private async getContentByType(fileId: string, contentType: string) {
//     const record = await this.aiContentRepo.findOne({ where: { fileId, contentType } });
//     if (!record) throw new NotFoundException(`No generated ${contentType.toLowerCase()} found for this file`);
//     return record;
//   }
// }




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