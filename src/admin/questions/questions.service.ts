// src/admin/questions/questions.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { AdminQuestion } from './entities/admin-question.entity.js';
import { CreateAdminQuestionDto } from './dto/create-admin-question.dto.js';
import { UpdateAdminQuestionDto } from './dto/update-admin-question.dto.js';
import { AdminQuestionsQueryDto } from './dto/admin-questions-query.dto.js';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(AdminQuestion)
    private readonly questionRepo: Repository<AdminQuestion>,
  ) {}

  async findAll(query: AdminQuestionsQueryDto) {
    const { page = 1, limit = 10, search, status } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status.toUpperCase();
    if (search) {
      where.questionText = Like(`%${search}%`);
    }

    const [questions, total] = await this.questionRepo.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      status: 'success',
      data: {
        questions,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async findOne(id: string) {
    const question = await this.questionRepo.findOne({ where: { id } });
    if (!question) throw new NotFoundException('Question not found');
    return { status: 'success', data: question };
  }

  async create(dto: CreateAdminQuestionDto) {
    const question = this.questionRepo.create(dto);
    const saved = await this.questionRepo.save(question);
    return { status: 'success', message: 'Question created successfully', data: saved };
  }

  async update(id: string, dto: UpdateAdminQuestionDto) {
    const question = await this.questionRepo.findOne({ where: { id } });
    if (!question) throw new NotFoundException('Question not found');

    Object.assign(question, dto);
    const updated = await this.questionRepo.save(question);
    return { status: 'success', message: 'Question updated successfully', data: updated };
  }

  async remove(id: string) {
    const question = await this.questionRepo.findOne({ where: { id } });
    if (!question) throw new NotFoundException('Question not found');

    await this.questionRepo.remove(question);
    return { status: 'success', message: 'Question deleted successfully' };
  }

  async approve(id: string) {
    const question = await this.questionRepo.findOne({ where: { id } });
    if (!question) throw new NotFoundException('Question not found');

    question.status = 'APPROVED';
    await this.questionRepo.save(question);
    return { status: 'success', message: 'Question has been approved.', data: question };
  }

  async reject(id: string) {
    const question = await this.questionRepo.findOne({ where: { id } });
    if (!question) throw new NotFoundException('Question not found');

    question.status = 'REJECTED';
    await this.questionRepo.save(question);
    return { status: 'success', message: 'Question has been rejected.', data: question };
  }
}