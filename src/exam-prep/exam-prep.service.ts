// // src/exam-prep/exam-prep.service.ts
// import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { Examination } from './entities/examination.entity.js';
// import { PastQuestion } from './entities/past-question.entity.js';
// import { ExamPrep } from './entities/exam-prep.entity.js';
// import { CreateExamPrepDto } from './dto/create-exam-prep.dto.js';

// @Injectable()
// export class ExamPrepService {
//   constructor(
//     @InjectRepository(Examination)
//     private examRepo: Repository<Examination>,
//     @InjectRepository(PastQuestion)
//     private pastQuestionRepo: Repository<PastQuestion>,
//     @InjectRepository(ExamPrep)
//     private examPrepRepo: Repository<ExamPrep>,
//   ) {}

//   // --- Examination Types ---
//   async findAllExaminations(): Promise<Examination[]> {
//     return await this.examRepo.find();
//   }

//   async findExaminationById(id: string): Promise<Examination> {
//     const exam = await this.examRepo.findOne({ where: { id } });
//     if (!exam) throw new HttpException('Examination board not found', HttpStatus.NOT_FOUND);
//     return exam;
//   }

//   // --- Past Questions Repository ---
//   async findAllPastQuestions(query: any): Promise<PastQuestion[]> {
//     const filter: any = {};
//     if (query.subject) filter.subject = query.subject;
//     if (query.year) filter.year = Number(query.year);
//     if (query.topic) filter.topic = query.topic;
//     return await this.pastQuestionRepo.find({ where: filter });
//   }

//   async findPastQuestionById(id: string): Promise<PastQuestion> {
//     const pq = await this.pastQuestionRepo.findOne({ where: { id } });
//     if (!pq) throw new HttpException('Past question not found', HttpStatus.NOT_FOUND);
//     return pq;
//   }

//   async getDistinctYears(): Promise<number[]> {
//     const results = await this.pastQuestionRepo
//       .createQueryBuilder('pq')
//       .select('DISTINCT pq.year', 'year')
//       .orderBy('year', 'DESC')
//       .getRawMany();
//     return results.map(r => r.year);
//   }

//   async getDistinctSubjects(): Promise<string[]> {
//     const results = await this.pastQuestionRepo
//       .createQueryBuilder('pq')
//       .select('DISTINCT pq.subject', 'subject')
//       .getRawMany();
//     return results.map(r => r.subject);
//   }

//   async getDistinctTopics(): Promise<string[]> {
//     const results = await this.pastQuestionRepo
//       .createQueryBuilder('pq')
//       .select('DISTINCT pq.topic', 'topic')
//       .getRawMany();
//     return results.map(r => r.topic);
//   }

//   // --- Exam Preparation Plans ---
//   async createPrepPlan(dto: CreateExamPrepDto): Promise<ExamPrep> {
//     const prep = this.examPrepRepo.create(dto);
//     return await this.examPrepRepo.save(prep);
//   }

//   async findAllPrepPlans(): Promise<ExamPrep[]> {
//     return await this.examPrepRepo.find();
//   }

//   async findPrepPlanById(id: string): Promise<ExamPrep> {
//     const prep = await this.examPrepRepo.findOne({ where: { id } });
//     if (!prep) throw new HttpException('Exam preparation plan not found', HttpStatus.NOT_FOUND);
//     return prep;
//   }

//   async updatePrepPlan(id: string, dto: Partial<CreateExamPrepDto>): Promise<ExamPrep> {
//     await this.findPrepPlanById(id);
//     await this.examPrepRepo.update(id, dto);
//     return this.findPrepPlanById(id);
//   }

//   async deletePrepPlan(id: string): Promise<{ status: string; message: string }> {
//     const prep = await this.findPrepPlanById(id);
//     await this.examPrepRepo.remove(prep);
//     return { status: 'success', message: 'Exam preparation plan deleted.' };
//   }
// }


// src/exam-prep/exam-prep.service.ts
import { Injectable, HttpException, HttpStatus, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { Examination } from './entities/examination.entity.js';
import { PastQuestion } from './entities/past-question.entity.js';
import { ExamPrep } from './entities/exam-prep.entity.js';
import { CreateExamPrepDto } from './dto/create-exam-prep.dto.js';

@Injectable()
export class ExamPrepService {
  private alocApiKey: string;
  private alocBaseUrl: string;

  constructor(
    @InjectRepository(Examination)
    private examRepo: Repository<Examination>,
    @InjectRepository(PastQuestion)
    private pastQuestionRepo: Repository<PastQuestion>,
    @InjectRepository(ExamPrep)
    private examPrepRepo: Repository<ExamPrep>,
    private configService: ConfigService,
  ) {
    this.alocApiKey = this.configService.get<string>('ALOC_API_KEY') || 'aloc_BE7smvfkCg9bqucipjhbwICH9FcyRMZRdtxrBmmr';
    this.alocBaseUrl = this.configService.get<string>('ALOC_BASE_URL') || 'https://dev.aloc.com.ng/api/v1';
  }

  // --- Examination Types ---
  async findAllExaminations(): Promise<Examination[]> {
    const exams = await this.examRepo.find();
    if (exams.length === 0) {
      const defaultExams = [
        { name: 'JAMB', description: 'Joint Admissions and Matriculation Board' },
        { name: 'WAEC', description: 'West African Examinations Council' },
        { name: 'NECO', description: 'National Examinations Council' },
      ];
      await this.examRepo.save(defaultExams);
      return await this.examRepo.find();
    }
    return exams;
  }

  async findExaminationById(id: string): Promise<Examination> {
    const exam = await this.examRepo.findOne({ where: { id } });
    if (!exam) throw new HttpException('Examination board not found', HttpStatus.NOT_FOUND);
    return exam;
  }

  // --- Past Questions Repository (ALOC + Local Caching) ---
  async findAllPastQuestions(query: { subject?: string; year?: string; type?: string; limit?: string; topic?: string }): Promise<PastQuestion[]> {
    const filter: any = {};
    if (query.subject) filter.subject = query.subject.toLowerCase();
    if (query.year) filter.year = Number(query.year);
    if (query.topic) filter.topic = query.topic;

    // 1. Check local DB cache first
    const localQuestions = await this.pastQuestionRepo.find({ where: filter });
    if (localQuestions && localQuestions.length > 0) {
      return localQuestions;
    }

    // 2. Fetch from ALOC API if not cached locally
    try {
      const response = await axios.get(`${this.alocBaseUrl}/questions`, {
        headers: {
          Authorization: `Bearer ${this.alocApiKey}`,
        },
        params: {
          subject: query.subject,
          year: query.year,
          type: query.type || 'jamb',
          limit: query.limit || 20,
        },
      });

      const externalData = response.data?.data || [];
      if (!Array.isArray(externalData) || externalData.length === 0) {
        return [];
      }

      // 3. Map and save to local PostgreSQL database
      const questionsToSave = externalData.map((q: any) => 
        this.pastQuestionRepo.create({
          id: q.id,
          text: q.text,
          options: q.options,
          correctAnswer: q.correctAnswer,
          examType: q.examType || query.type || 'jamb',
          subject: q.subject,
          year: Number(q.year),
          topic: q.topic || 'General',
          explanation: q.explanation || null,
          country: q.country || 'NG',
          questionNumber: q.questionNumber || null,
          hasPassage: q.hasPassage || false,
        })
      );

      await this.pastQuestionRepo.save(questionsToSave);
      return await this.pastQuestionRepo.find({ where: filter });
    } catch (error: unknown) {
      const err = error as AxiosError<any>;
      console.error('ALOC API Error:', err?.response?.data || err.message);
      throw new InternalServerErrorException('Failed to fetch past questions from examination provider');
    }
  }

  async findPastQuestionById(id: string): Promise<PastQuestion> {
    const pq = await this.pastQuestionRepo.findOne({ where: { id } });
    if (!pq) throw new HttpException('Past question not found', HttpStatus.NOT_FOUND);
    return pq;
  }

  async getDistinctYears(): Promise<number[]> {
    const results = await this.pastQuestionRepo
      .createQueryBuilder('pq')
      .select('DISTINCT pq.year', 'year')
      .orderBy('year', 'DESC')
      .getRawMany();
    return results.map(r => r.year);
  }

  async getDistinctSubjects(): Promise<string[]> {
    const results = await this.pastQuestionRepo
      .createQueryBuilder('pq')
      .select('DISTINCT pq.subject', 'subject')
      .getRawMany();
    return results.map(r => r.subject);
  }

  async getDistinctTopics(): Promise<string[]> {
    const results = await this.pastQuestionRepo
      .createQueryBuilder('pq')
      .select('DISTINCT pq.topic', 'topic')
      .getRawMany();
    return results.map(r => r.topic);
  }

// --- Exam Preparation Plans ---
  async createPrepPlan(dto: CreateExamPrepDto): Promise<ExamPrep> {
    const prep = this.examPrepRepo.create({
      title: dto.title,
      examType: dto.examType,
      subjects: dto.subjects,
      targetDate: new Date(dto.targetDate),
      notes: dto.notes,
    } as any) as any;
    
    return await this.examPrepRepo.save(prep);
  }

  async findAllPrepPlans(): Promise<ExamPrep[]> {
    return await this.examPrepRepo.find();
  }

  async findPrepPlanById(id: string): Promise<ExamPrep> {
    const prep = await this.examPrepRepo.findOne({ where: { id } });
    if (!prep) throw new HttpException('Exam preparation plan not found', HttpStatus.NOT_FOUND);
    return prep;
  }

  async updatePrepPlan(id: string, dto: Partial<CreateExamPrepDto>): Promise<ExamPrep> {
    await this.findPrepPlanById(id);
    const updatePayload: any = { ...dto };
    if (dto.targetDate) {
      updatePayload.targetDate = new Date(dto.targetDate);
    }
    await this.examPrepRepo.update(id, updatePayload);
    return this.findPrepPlanById(id);
  }

  async deletePrepPlan(id: string): Promise<{ status: string; message: string }> {
    const prep = await this.findPrepPlanById(id);
    await this.examPrepRepo.remove(prep);
    return { status: 'success', message: 'Exam preparation plan deleted.' };
  }
}