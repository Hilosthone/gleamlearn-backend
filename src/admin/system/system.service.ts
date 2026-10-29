import { featureUnavailable } from '../../common/errors/feature-unavailable.js';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as os from 'os';

@Injectable()
export class SystemService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async getHealth() {
    const dbConnected = this.dataSource.isInitialized;
    const memoryUsage = process.memoryUsage();
    const uptimeSeconds = process.uptime();

    return {
      status: 'success',
      data: {
        serverStatus: 'healthy',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(uptimeSeconds),
        database: {
          connected: dbConnected,
          driver: 'postgres (Supabase)',
        },
        system: {
          platform: os.platform(),
          nodeVersion: process.version,
          cpuArch: os.arch(),
          totalMemoryMb: Math.round(os.totalmem() / (1024 * 1024)),
          freeMemoryMb: Math.round(os.freemem() / (1024 * 1024)),
          heapUsedMb: Math.round(memoryUsage.heapUsed / (1024 * 1024)),
        },
      },
    };
  }

  async getQueues(): Promise<never> {
    throw featureUnavailable('Queue metrics', 'no source for this metric is connected (the previous figures were invented)');
  }

  async getStorage(): Promise<never> {
    throw featureUnavailable('Storage metrics', 'no source for this metric is connected (the previous figures were invented)');
  }

  async getAiMetrics(): Promise<never> {
    throw featureUnavailable('AI metrics', 'no source for this metric is connected (the previous figures were invented)');
  }

  async getErrors(): Promise<never> {
    throw featureUnavailable('Error metrics', 'no source for this metric is connected (the previous figures were invented)');
  }
}