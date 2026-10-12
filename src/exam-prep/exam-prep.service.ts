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
import { Injectable, HttpException, HttpStatus, InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
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
    // No fallback key (a key was previously committed here and must be rotated by the owner)
    this.alocApiKey = this.configService.get<string>('ALOC_API_KEY')?.trim() ?? '';
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
    if (!this.alocApiKey) {
      throw new ServiceUnavailableException('The past-questions provider is not configured (ALOC_API_KEY).');
    }
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
  /**
   * The DTO (title, examType, subjects, targetDate, notes) does not match the exam_preps columns
   * (userId, examinationId, targetSubject, targetExamDate, studyPlan), so every create used to fail
   * (userId / examinationId are NOT NULL). It is mapped onto the existing columns; no schema change.
   */
  private toColumns(dto: Partial<CreateExamPrepDto>, current?: ExamPrep): Partial<ExamPrep> {
    const plan: Record<string, unknown> = { ...(current?.studyPlan as Record<string, unknown> | undefined) };
    if (dto.title !== undefined) plan.title = dto.title;
    if (dto.examType !== undefined) plan.examType = dto.examType;
    if (dto.subjects !== undefined) plan.subjects = dto.subjects;
    if (dto.notes !== undefined) plan.notes = dto.notes;
    const out: Partial<ExamPrep> = { studyPlan: plan };
    if (dto.examType !== undefined) out.examinationId = String(dto.examType);
    if (dto.subjects !== undefined) out.targetSubject = (dto.subjects ?? []).join(', ');
    if (dto.targetDate !== undefined) out.targetExamDate = new Date(dto.targetDate);
    return out;
  }

  async createPrepPlan(userId: string, dto: CreateExamPrepDto): Promise<ExamPrep> {
    const prep = this.examPrepRepo.create({ ...this.toColumns(dto), userId });
    return await this.examPrepRepo.save(prep);
  }

  /** Only the caller's plans (this returned every user's plans before). */
  async findAllPrepPlans(userId: string): Promise<ExamPrep[]> {
    return await this.examPrepRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  /** Owner-scoped: another user's plan is reported as not found. */
  async findPrepPlanById(id: string, userId: string): Promise<ExamPrep> {
    const prep = await this.examPrepRepo.findOne({ where: { id, userId } });
    if (!prep) throw new HttpException('Exam preparation plan not found', HttpStatus.NOT_FOUND);
    return prep;
  }

  async updatePrepPlan(id: string, userId: string, dto: Partial<CreateExamPrepDto>): Promise<ExamPrep> {
    const current = await this.findPrepPlanById(id, userId);
    await this.examPrepRepo.update({ id, userId }, this.toColumns(dto, current) as any);
    return this.findPrepPlanById(id, userId);
  }

  async deletePrepPlan(id: string, userId: string): Promise<{ status: string; message: string }> {
    const prep = await this.findPrepPlanById(id, userId);
    await this.examPrepRepo.remove(prep);
    return { status: 'success', message: 'Exam preparation plan deleted.' };
  }
}