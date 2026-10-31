// src/common/ai-service/ai-http.client.ts
import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { currentRequestId, currentUserId, REQUEST_ID_HEADER } from '../request-context.js';

/** Header the AI service uses to rate-limit per learner (it trusts it only on requests carrying AI_API_KEY). */
export const AI_USER_HEADER = 'X-GleamLearn-User';

// Shared HTTP client for calls from this backend to the Python AI microservice.
// - Base URL: AI_SERVICE_URL (defaults to a local AI service, never to production)
// - Auth: AI_API_KEY, sent both as a Bearer token and as X-API-Key so every AI router accepts it.
//   There is deliberately no fallback secret: a missing key is sent as empty and rejected by the AI service.
// - Timeout: AI_HTTP_TIMEOUT_MS (default 120s). The AI service answers every request within its own budget
//   (AI_REQUEST_BUDGET_SECONDS, 100 s by default), so this must stay above that plus network time
//   (see AI_SERVICE_BUDGET_MS); then a slow model surfaces as the AI service's coded timeout, not as ours.
// - Retries: none. AI generation requests are not idempotent and every retry is billed by the model provider.
// - Tracing: every call carries the request's X-Request-Id (shared with the AI service's logs) and logs its start
//   and end — method, path, status, duration and failure category only. Never bodies, headers or keys.

export const DEFAULT_AI_SERVICE_URL = 'http://127.0.0.1:8000';
export const DEFAULT_AI_HTTP_TIMEOUT_MS = 120_000;
/** The AI service's default whole-request budget (gleamlearn-ai-service: AI_REQUEST_BUDGET_SECONDS). */
export const AI_SERVICE_BUDGET_MS = 100_000;
/** Headroom the backend keeps above that budget for network time, a cold connection and the response transfer. */
export const AI_TIMEOUT_HEADROOM_MS = 15_000;

const logger = new Logger('AiServiceClient');
const started = new WeakMap<object, { at: number; id: string }>();

let cachedClient: AxiosInstance | null = null;
let cachedSignature = '';

export function aiHttpTimeoutMs(env: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number.parseInt(env.AI_HTTP_TIMEOUT_MS ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_AI_HTTP_TIMEOUT_MS;
}

/** Why an AI call failed, in a few stable words for logs. */
export function failureCategory(error: any): string {
  const status: number | undefined = error?.response?.status;
  if (status !== undefined) {
    const detail = error?.response?.data?.detail;
    const code = detail && typeof detail === 'object' ? detail.code : undefined;
    return `http_${status}${code ? `:${code}` : ''}`;
  }
  const code: string | undefined = error?.code;
  if (code === 'ECONNABORTED' || code === 'ETIMEDOUT' || /timeout/i.test(error?.message ?? '')) return 'timeout';
  if (code === 'ECONNREFUSED') return 'connection_refused';
  if (code === 'ECONNRESET' || /socket hang up/i.test(error?.message ?? '')) return 'connection_reset';
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'dns';
  if (code === 'ERR_CANCELED') return 'canceled';
  return code ? `network:${code}` : 'unknown';
}

const pathOf = (config: { url?: string } | undefined) => String(config?.url ?? '').split('?')[0];

/** Elapsed time and request id of a call made through this client (for the error mapper's log line). */
export function callInfo(config: object | undefined): { id?: string; ms?: number } {
  const s = config ? started.get(config) : undefined;
  return s ? { id: s.id, ms: Date.now() - s.at } : {};
}

export function getAiHttpClient(): AxiosInstance {
  const baseURL = (process.env.AI_SERVICE_URL || DEFAULT_AI_SERVICE_URL).replace(/\/+$/, '');
  const apiKey = process.env.AI_API_KEY ?? '';
  const timeout = aiHttpTimeoutMs();

  const signature = `${baseURL}|${timeout}|${apiKey}`;
  if (cachedClient && cachedSignature === signature) return cachedClient;

  if (timeout < AI_SERVICE_BUDGET_MS + AI_TIMEOUT_HEADROOM_MS) {
    logger.warn(
      `AI_HTTP_TIMEOUT_MS=${timeout} is below the AI service's ${AI_SERVICE_BUDGET_MS} ms budget plus ${AI_TIMEOUT_HEADROOM_MS} ms headroom: ` +
        'slow generations will time out here before the AI service can answer.',
    );
  }

  cachedClient = axios.create({
    baseURL,
    timeout,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'X-API-Key': apiKey,
    },
  });
  cachedClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const userId = currentUserId();
    if (userId) config.headers.set(AI_USER_HEADER, userId);
    const id = currentRequestId() ?? randomUUID();
    config.headers.set(REQUEST_ID_HEADER, id);
    started.set(config, { at: Date.now(), id });
    logger.log(`ai.call.start id=${id} ${String(config.method ?? 'get').toUpperCase()} ${pathOf(config)}`);
    return config;
  });
  cachedClient.interceptors.response.use(
    (response) => {
      const { id, ms } = callInfo(response.config);
      logger.log(`ai.call.completed id=${id ?? '-'} ${String(response.config.method ?? '').toUpperCase()} ${pathOf(response.config)} status=${response.status} ms=${ms ?? '-'}`);
      return response;
    },
    (error) => {
      const { id, ms } = callInfo(error?.config);
      logger.warn(
        `ai.call.failed id=${id ?? '-'} ${String(error?.config?.method ?? '').toUpperCase()} ${pathOf(error?.config)} category=${failureCategory(error)} ms=${ms ?? '-'}`,
      );
      return Promise.reject(error);
    },
  );
  cachedSignature = signature;
  return cachedClient;
}
