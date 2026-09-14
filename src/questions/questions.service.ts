// src/questions/questions.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from './entities/question.entity.js';
import { CreateQuestionDto, UpdateQuestionDto, QueryQuestionsDto } from './dto/question.dto.js';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
  ) {}

  async create(createDto: CreateQuestionDto): Promise<Question> {
    const question = this.questionRepository.create(createDto);
    return await this.questionRepository.save(question);
  }

  async findAll(queryDto: QueryQuestionsDto): Promise<Question[]> {
    const query = this.questionRepository.createQueryBuilder('question');

    if (queryDto.courseId) {
      query.andWhere('question.courseId = :courseId', { courseId: queryDto.courseId });
    }
    if (queryDto.subject) {
      query.andWhere('question.subject ILIKE :subject', { subject: `%${queryDto.subject}%` });
    }
    if (queryDto.topic) {
      query.andWhere('question.topic ILIKE :topic', { topic: `%${queryDto.topic}%` });
    }
    if (queryDto.difficulty) {
      query.andWhere('question.difficulty = :difficulty', { difficulty: queryDto.difficulty });
    }
    if (queryDto.type) {
      query.andWhere('question.type = :type', { type: queryDto.type });
    }
    if (queryDto.examination) {
      query.andWhere('question.examination ILIKE :examination', { examination: `%${queryDto.examination}%` });
    }
    if (queryDto.year) {
      query.andWhere('question.year = :year', { year: queryDto.year });
    }
    if (queryDto.source) {
      query.andWhere('question.source ILIKE :source', { source: `%${queryDto.source}%` });
    }

    return await query.getMany();
  }

  async findOne(id: string): Promise<Question> {
    const question = await this.questionRepository.findOne({ where: { id } });
    if (!question) {
      throw new NotFoundException(`Question with ID ${id} not found`);
    }
    return question;
  }

  async update(id: string, updateDto: UpdateQuestionDto): Promise<Question> {
    await this.findOne(id);
    await this.questionRepository.update(id, updateDto);
    return await this.findOne(id);
  }

  async remove(id: string): Promise<{ message: string }> {
    const result = await this.questionRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Question with ID ${id} not found`);
    }
    return { message: 'Question successfully deleted' };
  }
}