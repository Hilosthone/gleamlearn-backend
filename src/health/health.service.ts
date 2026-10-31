import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import axios from 'axios';
import { DEFAULT_AI_SERVICE_URL, failureCategory } from '../common/ai-service/ai-http.client.js';

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

  /**
   * Whether the AI service answers, and how fast. It calls the service's root (no model inference, no AI_API_KEY)
   * with a short timeout. It used to report "up" without contacting anything, and returned AI_SERVICE_URL.
   * This route is public, so a result is reused for AI_HEALTH_CACHE_MS and only one check runs at a time:
   * polling it cannot turn into traffic against the AI service.
   */
  async checkAi(): Promise<AiHealth> {
    const now = Date.now();
    if (this.aiHealth && now - this.aiHealth.at < AI_HEALTH_CACHE_MS) return this.aiHealth.result;
    this.aiHealthInFlight ??= this.probeAi().finally(() => {
      this.aiHealthInFlight = null;
    });
    return this.aiHealthInFlight;
  }

  private aiHealth: { at: number; result: AiHealth } | null = null;
  private aiHealthInFlight: Promise<AiHealth> | null = null;

  private async probeAi(): Promise<AiHealth> {
    const baseURL = (process.env.AI_SERVICE_URL || DEFAULT_AI_SERVICE_URL).replace(/\/+$/, '');
    const timeout = Number.parseInt(process.env.AI_HEALTH_TIMEOUT_MS ?? '', 10) || DEFAULT_AI_HEALTH_TIMEOUT_MS;
    const started = Date.now();
    let result: AiHealth;
    try {
      // any HTTP answer means the service is running; a 429 is its rate limit on this route, still reachable
      const res = await axios.get(`${baseURL}/`, { timeout, validateStatus: () => true, maxRedirects: 0 });
      const latencyMs = Date.now() - started;
      result =
        res.status < 500
          ? { status: 'up', provider: 'AI Service', latencyMs, timestamp: new Date().toISOString() }
          : { status: 'down', provider: 'AI Service', latencyMs, error: `http_${res.status}`, timestamp: new Date().toISOString() };
    } catch (error) {
      // a category, never the raw message (it can contain the internal host name)
      result = { status: 'down', provider: 'AI Service', latencyMs: Date.now() - started, error: failureCategory(error), timestamp: new Date().toISOString() };
    }
    this.aiHealth = { at: Date.now(), result };
    return result;
  }
}

export interface AiHealth {
  status: 'up' | 'down';
  provider: 'AI Service';
  latencyMs: number;
  error?: string;
  timestamp: string;
}

const DEFAULT_AI_HEALTH_TIMEOUT_MS = 4_000;
const AI_HEALTH_CACHE_MS = 10_000;