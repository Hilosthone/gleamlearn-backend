import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { ActivityLog } from '../activity/entities/activity-log.entity.js';
import { AuditQueryDto } from './dto/audit-query.dto.js';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly auditRepo: Repository<ActivityLog>,
  ) {}

  async findAll(query: AuditQueryDto) {
    const { page = 1, limit = 10, category, action, adminId } = query;
    const where: FindOptionsWhere<ActivityLog> = {};

    if (category) where.category = category;
    if (action) where.action = action;
    if (adminId) where.adminId = adminId;

    const [logs, total] = await this.auditRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { timestamp: 'DESC' },
    });

    return {
      status: 'success',
      data: {
        auditLogs: logs,
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
    const log = await this.auditRepo.findOne({ where: { id } });
    if (!log) {
      throw new NotFoundException(`Audit log record with ID ${id} not found`);
    }

    return {
      status: 'success',
      data: log,
    };
  }
}