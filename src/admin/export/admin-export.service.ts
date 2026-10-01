import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../auth/entities/user.entity.js';
import { ActivityLog } from '../activity/entities/activity-log.entity.js';
import { ExportFormat } from './dto/export-query.dto.js';
import { Response } from 'express';

@Injectable()
export class AdminExportService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(ActivityLog)
    private readonly activityRepo: Repository<ActivityLog>,
  ) {}

  /**
   * Generic helper to send data either as JSON or CSV/Excel file attachment
   */
  private sendResponse(
    res: Response,
    data: any[],
    filenamePrefix: string,
    format: ExportFormat,
  ) {
    const timestamp = new Date().toISOString().split('T')[0];

    if (format === ExportFormat.JSON) {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${filenamePrefix}-${timestamp}.json`,
      );
      return res.status(200).json({ status: 'success', count: data.length, data });
    }

    // For CSV or Excel (Excel opens standard CSV files seamlessly)
    const csvData = this.convertToCSV(data);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${filenamePrefix}-${timestamp}.${format === ExportFormat.EXCEL ? 'csv' : 'csv'}`,
    );
    return res.status(200).send(csvData);
  }

  /**
   * Converts an array of objects into a flat CSV string
   */
  private convertToCSV(arr: any[]): string {
    if (!arr || arr.length === 0) return '';
    const keys = Object.keys(arr[0]);
    const header = keys.join(',');
    const rows = arr.map((obj) =>
      keys
        .map((key) => {
          let val = obj[key];
          if (val === null || val === undefined) val = '';
          if (typeof val === 'object') val = JSON.stringify(val);
          // Escape quotes and commas
          const stringVal = String(val).replace(/"/g, '""');
          return `"${stringVal}"`;
        })
        .join(','),
    );
    return [header, ...rows].join('\n');
  }

  async exportUsers(format: ExportFormat, res: Response) {
    const users = await this.userRepo.find({
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        educationType: true,
        university: true,
        isEmailVerified: true,
        isRestricted: true,
        createdAt: true,
      },
    });
    return this.sendResponse(res, users, 'users-export', format);
  }

  async exportAnalytics(format: ExportFormat, res: Response) {
    // Aggregated metrics sample for platform analytics
    const totalUsers = await this.userRepo.count();
    const verifiedUsers = await this.userRepo.count({ where: { isEmailVerified: true } });
    const restrictedUsers = await this.userRepo.count({ where: { isRestricted: true } });

    const analyticsData = [
      { metric: 'Total Registered Users', value: totalUsers },
      { metric: 'Verified Email Users', value: verifiedUsers },
      { metric: 'Restricted / Suspended Users', value: restrictedUsers },
      { metric: 'Export Generated At', value: new Date().toISOString() },
    ];

    return this.sendResponse(res, analyticsData, 'analytics-export', format);
  }

  async exportTransactions(format: ExportFormat, res: Response) {
    // Placeholder for transaction logs (wire up your transaction repository here if available)
    const mockTransactions = [
      { transactionId: 'txn_001', user: 'johndoe', amount: 5000, currency: 'NGN', status: 'SUCCESS', date: new Date().toISOString() },
      { transactionId: 'txn_002', user: 'janedoe', amount: 12000, currency: 'NGN', status: 'SUCCESS', date: new Date().toISOString() },
    ];
    return this.sendResponse(res, mockTransactions, 'transactions-export', format);
  }

  async exportActivity(format: ExportFormat, res: Response) {
    const activities = await this.activityRepo.find({
      take: 1000,
    });
    return this.sendResponse(res, activities, 'activity-logs-export', format);
  }
}