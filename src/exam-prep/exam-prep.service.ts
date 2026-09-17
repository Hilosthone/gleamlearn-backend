// src/exam-prep/exam-prep.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Examination } from './entities/examination.entity.js';
import { PastQuestion } from './entities/past-question.entity.js';
import { ExamPrep } from './entities/exam-prep.entity.js';
import { CreateExamPrepDto } from './dto/create-exam-prep.dto.js';

@Injectable()
export class ExamPrepService {
  constructor(
    @InjectRepository(Examination)
    private examRepo: Repository<Examination>,
    @InjectRepository(PastQuestion)
    private pastQuestionRepo: Repository<PastQuestion>,
    @InjectRepository(ExamPrep)
    private examPrepRepo: Repository<ExamPrep>,
  ) {}

  // --- Examination Types ---
  async findAllExaminations(): Promise<Examination[]> {
    return await this.examRepo.find();
  }

  async findExaminationById(id: string): Promise<Examination> {
    const exam = await this.examRepo.findOne({ where: { id } });
    if (!exam) throw new HttpException('Examination board not found', HttpStatus.NOT_FOUND);
    return exam;
  }

  // --- Past Questions Repository ---
  async findAllPastQuestions(query: any): Promise<PastQuestion[]> {
    const filter: any = {};
    if (query.subject) filter.subject = query.subject;
    if (query.year) filter.year = Number(query.year);
    if (query.topic) filter.topic = query.topic;
    return await this.pastQuestionRepo.find({ where: filter });
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
    const prep = this.examPrepRepo.create(dto);
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
    await this.examPrepRepo.update(id, dto);
    return this.findPrepPlanById(id);
  }

  async deletePrepPlan(id: string): Promise<{ status: string; message: string }> {
    const prep = await this.findPrepPlanById(id);
    await this.examPrepRepo.remove(prep);
    return { status: 'success', message: 'Exam preparation plan deleted.' };
  }
}