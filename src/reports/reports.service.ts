// src/reports/reports.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateReportDto } from './dto/create-report.dto.js';
import { CreateFeedbackDto } from './dto/create-feedback.dto.js';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReport(dto: CreateReportDto, userId: string) {
    return this.prisma.report.create({
      data: {
        type: dto.type,
        reason: dto.reason,
        details: dto.details,
        userId,
      },
    });
  }

  async getUserReports(userId: string) {
    return this.prisma.report.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async submitFeedback(dto: CreateFeedbackDto, userId: string) {
    return this.prisma.feedback.create({
      data: {
        message: dto.message,
        rating: dto.rating,
        userId,
      },
    });
  }

  async reportTarget(targetType: 'QUESTION' | 'CONTENT', targetId: string, dto: CreateReportDto, userId: string) {
    return this.prisma.report.create({
      data: {
        type: dto.type,
        reason: dto.reason,
        details: dto.details,
        targetType,
        targetId,
        userId,
      },
    });
  }
}