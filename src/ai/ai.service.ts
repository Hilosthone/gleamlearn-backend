// // src/ai/ai.service.ts
// import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { ConfigService } from '@nestjs/config';
// import { AiContentEntity } from './entities/ai-content.entity.js';
// import { FilesService } from '../files/files.service.js';

// @Injectable()
// export class AiService {
//   private aiServiceUrl: string;

//   constructor(
//     @InjectRepository(AiContentEntity) private aiContentRepo: Repository<AiContentEntity>,
//     private filesService: FilesService,
//     private configService: ConfigService,
//   ) {
//     // Retrieves FastAPI endpoint from environment variables, defaulting to local port 8000
//     this.aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:8000');
//   }

//   // Helper method to forward request to FastAPI AI service
//   private async callFastApi(endpoint: string, fileId: string, additionalData?: any) {
//     const file = await this.filesService.findFileById(fileId);

//     try {
//       const response = await fetch(`${this.aiServiceUrl}/api/v1/${endpoint}`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ fileId: file.id, fileUrl: file.url, ...additionalData }),
//       });

//       if (!response.ok) {
//         throw new Error(`FastAPI service error: ${response.statusText}`);
//       }

//       return await response.json();
//     } catch (error: any) {
//       // Fallback response simulation if FastAPI container is offline during local testing
//       return {
//         warning: 'Connected to mock AI fallback (FastAPI service unreachable)',
//         fileId,
//         endpointCalled: endpoint,
//         processedAt: new Date().toISOString(),
//         result: `Simulated AI generation result for ${endpoint}`,
//       };
//     }
//   }

//   async analyzeDocument(fileId: string) {
//     const data = await this.callFastApi('analyze', fileId);
//     return this.saveOrUpdateContent(fileId, 'ANALYSIS', data);
//   }

//   async getAnalysis(fileId: string) {
//     return this.getContentByType(fileId, 'ANALYSIS');
//   }

//   async generateNotes(fileId: string) {
//     const data = await this.callFastApi('notes', fileId);
//     return this.saveOrUpdateContent(fileId, 'NOTES', data);
//   }

//   async generateSummary(fileId: string) {
//     const data = await this.callFastApi('summary', fileId);
//     return this.saveOrUpdateContent(fileId, 'SUMMARY', data);
//   }

//   async generateFlashcards(fileId: string) {
//     const data = await this.callFastApi('flashcards', fileId);
//     return this.saveOrUpdateContent(fileId, 'FLASHCARDS', data);
//   }

//   async generateQuestions(fileId: string) {
//     const data = await this.callFastApi('questions', fileId);
//     return this.saveOrUpdateContent(fileId, 'QUESTIONS', data);
//   }

//   async generateQuiz(fileId: string) {
//     const data = await this.callFastApi('quiz', fileId);
//     return this.saveOrUpdateContent(fileId, 'QUIZ', data);
//   }

//   async generateTest(fileId: string) {
//     const data = await this.callFastApi('test', fileId);
//     return this.saveOrUpdateContent(fileId, 'TEST', data);
//   }

//   async generateExam(fileId: string) {
//     const data = await this.callFastApi('exam', fileId);
//     return this.saveOrUpdateContent(fileId, 'EXAM', data);
//   }

//   async createCourseFromDocument(fileId: string) {
//     const data = await this.callFastApi('create-course', fileId);
//     return this.saveOrUpdateContent(fileId, 'COURSE', data);
//   }

//   async getAllGeneratedContent(fileId: string) {
//     return this.aiContentRepo.find({ where: { fileId }, order: { createdAt: 'DESC' } });
//   }

//   // Internal persistence helper
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

  private async callFastApi(endpoint: string, fileId: string, dto?: GenerateAiDto) {
    const file = await this.filesService.findFileById(fileId);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.aiApiKey) {
      headers['Authorization'] = `Bearer ${this.aiApiKey}`;
    }

    try {
      const response = await fetch(`${this.aiServiceUrl}/api/v1/${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fileId: file.id,
          fileUrl: file.url,
          options: dto || {},
        }),
      });

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
    const data = await this.callFastApi('analyze', fileId, dto);
    return this.saveOrUpdateContent(fileId, 'ANALYSIS', data);
  }

  async getAnalysis(fileId: string) {
    return this.getContentByType(fileId, 'ANALYSIS');
  }

  async generateNotes(fileId: string, dto?: GenerateAiDto) {
    const data = await this.callFastApi('notes', fileId, dto);
    return this.saveOrUpdateContent(fileId, 'NOTES', data);
  }

  async generateSummary(fileId: string, dto?: GenerateAiDto) {
    const data = await this.callFastApi('summary', fileId, dto);
    return this.saveOrUpdateContent(fileId, 'SUMMARY', data);
  }

  async generateFlashcards(fileId: string, dto?: GenerateAiDto) {
    const data = await this.callFastApi('flashcards', fileId, dto);
    return this.saveOrUpdateContent(fileId, 'FLASHCARDS', data);
  }

  async generateQuestions(fileId: string, dto?: GenerateAiDto) {
    const data = await this.callFastApi('questions', fileId, dto);
    return this.saveOrUpdateContent(fileId, 'QUESTIONS', data);
  }

  async generateQuiz(fileId: string, dto?: GenerateAiDto) {
    const data = await this.callFastApi('quiz', fileId, dto);
    return this.saveOrUpdateContent(fileId, 'QUIZ', data);
  }

  async generateTest(fileId: string, dto?: GenerateAiDto) {
    const data = await this.callFastApi('test', fileId, dto);
    return this.saveOrUpdateContent(fileId, 'TEST', data);
  }

  async generateExam(fileId: string, dto?: GenerateAiDto) {
    const data = await this.callFastApi('exam', fileId, dto);
    return this.saveOrUpdateContent(fileId, 'EXAM', data);
  }

  async createCourseFromDocument(fileId: string, dto?: GenerateAiDto) {
    const data = await this.callFastApi('create-course', fileId, dto);
    return this.saveOrUpdateContent(fileId, 'COURSE', data);
  }

  async getAllGeneratedContent(fileId: string) {
    return this.aiContentRepo.find({ where: { fileId }, order: { createdAt: 'DESC' } });
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