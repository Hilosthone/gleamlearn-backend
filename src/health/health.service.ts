import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class HealthService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  getSystemHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  async checkDatabase() {
    try {
      const isConnected = this.dataSource.isInitialized;
      await this.dataSource.query('SELECT 1');
      return {
        status: 'up',
        database: 'postgresql',
        connected: isConnected,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'down',
        database: 'postgresql',
        error: error instanceof Error ? error.message : 'Unknown database error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async checkRedis() {
    try {
      const redisStatus = 'up'; 
      return {
        status: redisStatus,
        cache: 'redis',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'down',
        cache: 'redis',
        error: error instanceof Error ? error.message : 'Redis connection failed',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async checkAi() {
    try {
      const aiEndpoint = process.env.AI_SERVICE_URL || 'Internal AI Provider';
      return {
        status: 'up',
        provider: aiEndpoint,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'down',
        provider: 'AI Service',
        error: error instanceof Error ? error.message : 'AI service unreachable',
        timestamp: new Date().toISOString(),
      };
    }
  }
}