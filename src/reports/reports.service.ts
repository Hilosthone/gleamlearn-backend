// src/reports/reports.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { withTable } from '../common/errors/missing-table.js';
import { AdminReport } from '../admin/reports/entities/admin-report.entity.js';
import { LearnerFeedback } from './learner-feedback.entity.js';
import { CreateReportDto, ReportType } from './dto/create-report.dto.js';
import { CreateFeedbackDto } from './dto/create-feedback.dto.js';

export type ReportTarget = 'GENERAL' | 'QUESTION' | 'CONTENT';

export interface ReportView {
  id: string;
  type: ReportType;
  target: string;
  targetId: string | null;
  reason: string;
  details: string | null;
  status: string;
  createdAt: Date;
}

/** admin_reports has no type column, so the type leads the reason ("[SPAM] …"), which moderators read as is. */
const TYPE_PREFIX = /^\[(SPAM|INAPPROPRIATE|COPYRIGHT|OTHER)\] /;

export function reportView(r: AdminReport): ReportView {
  const m = TYPE_PREFIX.exec(r.reason ?? '');
  return {
    id: r.id,
    type: (m?.[1] as ReportType) ?? ReportType.OTHER,
    target: r.reportedItemType,
    targetId: r.reportedItemId || null,
    reason: m ? r.reason.slice(m[0].length) : r.reason,
    details: r.description ?? null,
    status: r.status,
    createdAt: r.createdAt,
  };
}

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/**
 * Problem reports go into "admin_reports", the table the admin moderation routes (/admin/reports) already list,
 * resolve and reject. Feedback is stored in "learner_feedback". A missing table answers 501, never a fake success.
 */
@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(AdminReport) private readonly reports: Repository<AdminReport>,
    @InjectRepository(LearnerFeedback) private readonly feedback: Repository<LearnerFeedback>,
  ) {}

  async createReport(dto: CreateReportDto, userId: string) {
    return this.save('GENERAL', '', dto, userId);
  }

  async reportTarget(target: 'QUESTION' | 'CONTENT', targetId: string, dto: CreateReportDto, userId: string) {
    const id = text(targetId);
    if (!id || id.length > 255) throw new BadRequestException('Invalid item id.');
    return this.save(target, id, dto, userId);
  }

  getUserReports(userId: string): Promise<ReportView[]> {
    return withTable('Reports', async () =>
      (await this.reports.find({ where: { reporterId: userId }, order: { createdAt: 'DESC' }, take: 100 })).map(reportView),
    );
  }

  async submitFeedback(dto: CreateFeedbackDto, userId: string) {
    const message = text(dto.message);
    if (!message) throw new BadRequestException('Write your feedback first.');
    return withTable('Feedback', async () => {
      const row = await this.feedback.save(this.feedback.create({ userId, rating: dto.rating, message }));
      return { id: row.id, rating: row.rating, message: row.message, createdAt: row.createdAt };
    });
  }

  private async save(target: ReportTarget, targetId: string, dto: CreateReportDto, userId: string): Promise<ReportView> {
    const reason = text(dto.reason);
    if (!reason) throw new BadRequestException('Say what the problem is.');
    const details = text(dto.details) || undefined;
    return withTable('Reports', async () =>
      reportView(
        await this.reports.save(
          this.reports.create({
            reporterId: userId,
            reportedItemType: target,
            reportedItemId: targetId,
            reason: `[${dto.type}] ${reason}`,
            description: details,
            status: 'PENDING',
          }),
        ),
      ),
    );
  }
}
