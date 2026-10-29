// src/admin/reports/feedback.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt.guard.js';
import { AdminPermission, RequireAdminPermission } from '../auth/admin-permissions.js';
import { LearnerFeedback } from '../../reports/learner-feedback.entity.js';
import { withTable } from '../../common/errors/missing-table.js';

const clampInt = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Number.parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/** Learner feedback from Help & Support (rating 1–5 and a message), newest first, for moderators. */
@ApiTags('Admin Reports Management')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('api/v1/admin/feedback')
export class FeedbackController {
  constructor(@InjectRepository(LearnerFeedback) private readonly feedback: Repository<LearnerFeedback>) {}

  @RequireAdminPermission(AdminPermission.MODERATION_MANAGE)
  @Get()
  @ApiOperation({ summary: 'List learner feedback (optionally one rating) with the overall average' })
  @ApiResponse({ status: 200, description: 'Feedback retrieved successfully.' })
  findAll(@Query('page') page?: string, @Query('limit') limit?: string, @Query('rating') rating?: string) {
    const p = clampInt(page, 1, 10_000, 1);
    const l = clampInt(limit, 1, 100, 20);
    const r = rating === undefined || rating === '' ? undefined : clampInt(rating, 1, 5, 0) || undefined;
    return withTable('Feedback', async () => {
      const [items, total] = await this.feedback.findAndCount({ where: r ? { rating: r } : {}, order: { createdAt: 'DESC' }, skip: (p - 1) * l, take: l });
      const stats = (await this.feedback
        .createQueryBuilder('f')
        .select('COUNT(*)', 'count')
        .addSelect('AVG(f.rating)', 'average')
        .getRawOne()) as { count: string; average: string | null } | undefined;
      const count = Number(stats?.count) || 0;
      return {
        status: 'success',
        data: {
          feedback: items.map((f) => ({ id: f.id, userId: f.userId, rating: f.rating, message: f.message, createdAt: f.createdAt })),
          summary: { count, averageRating: count && stats?.average != null ? Math.round(Number(stats.average) * 10) / 10 : null },
          pagination: { total, page: p, limit: l, totalPages: Math.ceil(total / l) },
        },
      };
    });
  }
}
