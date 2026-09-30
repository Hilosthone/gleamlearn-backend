// src/admin/ai-moderation/ai-moderation.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiGeneratedContent } from './entities/ai-generated-content.entity.js';
import { AiContentQueryDto } from './dto/ai-content-query.dto.js';

@Injectable()
export class AiModerationService {
  constructor(
    @InjectRepository(AiGeneratedContent)
    private readonly aiContentRepo: Repository<AiGeneratedContent>,
  ) {}

  async findAll(query: AiContentQueryDto) {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status.toUpperCase();

    const [items, total] = await this.aiContentRepo.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      status: 'success',
      data: {
        contents: items,
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
    const item = await this.aiContentRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('AI generated content record not found');
    return { status: 'success', data: item };
  }

  async approve(id: string) {
    const item = await this.aiContentRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('AI generated content record not found');

    item.status = 'APPROVED';
    await this.aiContentRepo.save(item);
    return { status: 'success', message: 'AI generated content has been approved.', data: item };
  }

  async reject(id: string) {
    const item = await this.aiContentRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('AI generated content record not found');

    item.status = 'REJECTED';
    await this.aiContentRepo.save(item);
    return { status: 'success', message: 'AI generated content has been rejected.', data: item };
  }

  async remove(id: string) {
    const item = await this.aiContentRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('AI generated content record not found');

    await this.aiContentRepo.remove(item);
    return { status: 'success', message: 'AI generated content record deleted successfully' };
  }
}