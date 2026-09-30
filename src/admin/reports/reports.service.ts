// src/admin/reports/reports.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminReport } from './entities/admin-report.entity.js';
import { AdminReportsQueryDto } from './dto/admin-reports-query.dto.js';
import { UpdateAdminReportDto } from './dto/update-admin-report.dto.js';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(AdminReport)
    private readonly reportRepo: Repository<AdminReport>,
  ) {}

  async findAll(query: AdminReportsQueryDto) {
    const { page = 1, limit = 10, status, reportedItemType } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status.toUpperCase();
    if (reportedItemType) where.reportedItemType = reportedItemType.toUpperCase();

    const [reports, total] = await this.reportRepo.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      status: 'success',
      data: {
        reports,
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
    const report = await this.reportRepo.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');
    return { status: 'success', data: report };
  }

  async update(id: string, dto: UpdateAdminReportDto) {
    const report = await this.reportRepo.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');

    Object.assign(report, dto);
    const updated = await this.reportRepo.save(report);
    return { status: 'success', message: 'Report updated successfully', data: updated };
  }

  async resolve(id: string) {
    const report = await this.reportRepo.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');

    report.status = 'RESOLVED';
    await this.reportRepo.save(report);
    return { status: 'success', message: 'Report has been marked as resolved.', data: report };
  }

  async reject(id: string) {
    const report = await this.reportRepo.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');

    report.status = 'REJECTED';
    await this.reportRepo.save(report);
    return { status: 'success', message: 'Report has been rejected.', data: report };
  }
}