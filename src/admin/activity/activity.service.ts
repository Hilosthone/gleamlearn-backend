// src/admin/activity/activity.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from './entities/activity-log.entity.js';
import { ActivityQueryDto } from './dto/activity-query.dto.js';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityRepo: Repository<ActivityLog>,
  ) {}

  async getGlobalActivity(query: ActivityQueryDto, category?: string) {
    const { page = 1, limit = 20, action } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (category) where.category = category.toUpperCase();
    if (action) where.action = action.toUpperCase();

    const [logs, total] = await this.activityRepo.findAndCount({
      where,
      skip,
      take: limit,
      order: { timestamp: 'DESC' },
    });

    return {
      status: 'success',
      data: {
        activities: logs,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }
}