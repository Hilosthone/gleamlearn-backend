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

//   private async callFastApi(endpoint: string, fileId: string, dto?: GenerateAiDto) {
//     const file = await this.filesService.findFileById(fileId);

//     const headers: Record<string, string> = {
//       'Content-Type': 'application/json',
//     };

//     if (this.aiApiKey) {
//       headers['Authorization'] = `Bearer ${this.aiApiKey}`;
//     }

//     try {
//       const response = await fetch(`${this.aiServiceUrl}/api/v1/${endpoint}`, {
//         method: 'POST',
//         headers,
//         body: JSON.stringify({
//           fileId: file.id,
//           fileUrl: file.url,
//           options: dto || {},
//         }),
//       });

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
//     const data = await this.callFastApi('analyze', fileId, dto);
//     return this.saveOrUpdateContent(fileId, 'ANALYSIS', data);
//   }

//   async getAnalysis(fileId: string) {
//     return this.getContentByType(fileId, 'ANALYSIS');
//   }

//   async generateNotes(fileId: string, dto?: GenerateAiDto) {
//     const data = await this.callFastApi('notes', fileId, dto);
//     return this.saveOrUpdateContent(fileId, 'NOTES', data);
//   }

//   async generateSummary(fileId: string, dto?: GenerateAiDto) {
//     const data = await this.callFastApi('summary', fileId, dto);
//     return this.saveOrUpdateContent(fileId, 'SUMMARY', data);
//   }

//   async generateFlashcards(fileId: string, dto?: GenerateAiDto) {
//     const data = await this.callFastApi('flashcards', fileId, dto);
//     return this.saveOrUpdateContent(fileId, 'FLASHCARDS', data);
//   }

//   async generateQuestions(fileId: string, dto?: GenerateAiDto) {
//     const data = await this.callFastApi('questions', fileId, dto);
//     return this.saveOrUpdateContent(fileId, 'QUESTIONS', data);
//   }

//   async generateQuiz(fileId: string, dto?: GenerateAiDto) {
//     const data = await this.callFastApi('quiz', fileId, dto);
//     return this.saveOrUpdateContent(fileId, 'QUIZ', data);
//   }

//   async generateTest(fileId: string, dto?: GenerateAiDto) {
//     const data = await this.callFastApi('test', fileId, dto);
//     return this.saveOrUpdateContent(fileId, 'TEST', data);
//   }

//   async generateExam(fileId: string, dto?: GenerateAiDto) {
//     const data = await this.callFastApi('exam', fileId, dto);
//     return this.saveOrUpdateContent(fileId, 'EXAM', data);
//   }

//   async createCourseFromDocument(fileId: string, dto?: GenerateAiDto) {
//     const data = await this.callFastApi('create-course', fileId, dto);
//     return this.saveOrUpdateContent(fileId, 'COURSE', data);
//   }

//   async getAllGeneratedContent(fileId: string) {
//     return this.aiContentRepo.find({ where: { fileId }, order: { createdAt: 'DESC' } });
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
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AiContentEntity } from './entities/ai-content.entity.js';
import { FilesService } from '../files/files.service.js';
import { GenerateAiDto } from './dto/generate-ai.dto.js';

@Injectable()
export class AiService {
  private aiServiceUrl: string;
  private aiApiKey: string;

  constructor(
    @InjectRepository(AiContentEntity) private aiContentRepo: Repository<AiContentEntity>,
    private filesService: FilesService,
    private configService: ConfigService,
  ) {
    this.aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:8000');
    this.aiApiKey = this.configService.get<string>('AI_API_KEY', '');
  }

  private async callFastApi(endpoint: string, fileId: string, dto?: GenerateAiDto, method: string = 'POST', isGet: boolean = false) {
    const file = await this.filesService.findFileById(fileId);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.aiApiKey) {
      headers['Authorization'] = `Bearer ${this.aiApiKey}`;
    }

    try {
      const url = `${this.aiServiceUrl}/api/v1/${endpoint}`;
      const options: RequestInit = {
        method,
        headers,
      };

      if (!isGet) {
        options.body = JSON.stringify({
          fileId: file.id,
          fileUrl: file.url,
          options: dto || {},
        });
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`FastAPI service error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      return {
        warning: 'Connected to mock AI fallback (FastAPI service unreachable)',
        fileId,
        endpointCalled: endpoint,
        optionsProvided: dto || {},
        processedAt: new Date().toISOString(),
        result: `Simulated AI generation result for ${endpoint}`,
      };
    }
  }

  async analyzeDocument(fileId: string, dto?: GenerateAiDto) {
    const data = await this.callFastApi('ai/documents/' + fileId + '/analyze', fileId, dto);
    return this.saveOrUpdateContent(fileId, 'ANALYSIS', data);
  }

  async getAnalysis(fileId: string) {
    const data = await this.callFastApi('ai/documents/' + fileId + '/analysis', fileId, undefined, 'GET', true);
    return data;
  }

  async generateNotes(fileId: string, dto?: GenerateAiDto) {
    const data = await this.callFastApi('ai/documents/' + fileId + '/generate-notes', fileId, dto);
    return this.saveOrUpdateContent(fileId, 'NOTES', data);
  }

  async generateSummary(fileId: string, dto?: GenerateAiDto) {
    const data = await this.callFastApi('ai/documents/' + fileId + '/generate-summary', fileId, dto);
    return this.saveOrUpdateContent(fileId, 'SUMMARY', data);
  }

  async generateFlashcards(fileId: string, dto?: GenerateAiDto) {
    const data = await this.callFastApi('ai/documents/' + fileId + '/generate-flashcards', fileId, dto);
    return this.saveOrUpdateContent(fileId, 'FLASHCARDS', data);
  }

  async generateQuestions(fileId: string, dto?: GenerateAiDto) {
    const data = await this.callFastApi('ai/documents/' + fileId + '/generate-questions', fileId, dto);
    return this.saveOrUpdateContent(fileId, 'QUESTIONS', data);
  }

  async generateQuiz(fileId: string, dto?: GenerateAiDto) {
    const data = await this.callFastApi('ai/documents/' + fileId + '/generate-quiz', fileId, dto);
    return this.saveOrUpdateContent(fileId, 'QUIZ', data);
  }

  async generateTest(fileId: string, dto?: GenerateAiDto) {
    const data = await this.callFastApi('ai/documents/' + fileId + '/generate-test', fileId, dto);
    return this.saveOrUpdateContent(fileId, 'TEST', data);
  }

  async generateExam(fileId: string, dto?: GenerateAiDto) {
    const data = await this.callFastApi('ai/documents/' + fileId + '/generate-exam', fileId, dto);
    return this.saveOrUpdateContent(fileId, 'EXAM', data);
  }

  async createCourseFromDocument(fileId: string, dto?: GenerateAiDto) {
    const data = await this.callFastApi('ai/documents/' + fileId + '/create-course', fileId, dto);
    return this.saveOrUpdateContent(fileId, 'COURSE', data);
  }

  async getAllGeneratedContent(fileId: string) {
    return this.aiContentRepo.find({ where: { fileId }, order: { createdAt: 'DESC' } });
  }

  // =========================================================================
  // NEW METHODS: INTERACTIVE LIVE AI CLASS & PDF EXPORT
  // =========================================================================

  async generateLiveClass(fileId: string, dto?: GenerateAiDto) {
    const data = await this.callFastApi(`ai/documents/${fileId}/generate-live-class`, fileId, dto);
    return this.saveOrUpdateContent(fileId, 'LIVE_CLASS', data);
  }

  async getLiveClassStream(fileId: string) {
    return this.callFastApi(`ai/documents/${fileId}/live-class-stream`, fileId, undefined, 'GET', true);
  }

  async exportPdf(fileId: string, dto?: GenerateAiDto) {
    const data = await this.callFastApi(`ai/documents/${fileId}/export-pdf`, fileId, dto);
    return this.saveOrUpdateContent(fileId, 'PDF_EXPORT', data);
  }

  private async saveOrUpdateContent(fileId: string, contentType: string, payload: any) {
    let existing = await this.aiContentRepo.findOne({ where: { fileId, contentType } });
    if (existing) {
      existing.payload = payload;
      return this.aiContentRepo.save(existing);
    }
    const newRecord = this.aiContentRepo.create({ fileId, contentType, payload });
    return this.aiContentRepo.save(newRecord);
  }

  private async getContentByType(fileId: string, contentType: string) {
    const record = await this.aiContentRepo.findOne({ where: { fileId, contentType } });
    if (!record) throw new NotFoundException(`No generated ${contentType.toLowerCase()} found for this file`);
    return record;
  }
}