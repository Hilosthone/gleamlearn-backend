// src/common/ai-service/ai-http.client.ts
import axios, { AxiosInstance } from 'axios';
import { currentUserId } from '../request-context.js';

/** Header the AI service uses to rate-limit per learner (it trusts it only on requests carrying AI_API_KEY). */
export const AI_USER_HEADER = 'X-GleamLearn-User';

// Shared HTTP client for calls from this backend to the Python AI microservice.
// - Base URL: AI_SERVICE_URL (defaults to a local AI service, never to production)
// - Auth: AI_API_KEY, sent both as a Bearer token and as X-API-Key so every AI router accepts it.
//   There is deliberately no fallback secret: a missing key is sent as empty and rejected by the AI service.
// - Timeout: AI_HTTP_TIMEOUT_MS (default 120s, enough for a cold start plus one generation)
// - Retries: none. AI generation requests are not idempotent and every retry is billed by the model provider.

export const DEFAULT_AI_SERVICE_URL = 'http://127.0.0.1:8000';
export const DEFAULT_AI_HTTP_TIMEOUT_MS = 120_000;

let cachedClient: AxiosInstance | null = null;
let cachedSignature = '';

export function getAiHttpClient(): AxiosInstance {
  const baseURL = (process.env.AI_SERVICE_URL || DEFAULT_AI_SERVICE_URL).replace(/\/+$/, '');
  const apiKey = process.env.AI_API_KEY ?? '';
  const parsedTimeout = Number.parseInt(process.env.AI_HTTP_TIMEOUT_MS ?? '', 10);
  const timeout = Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : DEFAULT_AI_HTTP_TIMEOUT_MS;

  const signature = `${baseURL}|${timeout}|${apiKey}`;
  if (cachedClient && cachedSignature === signature) return cachedClient;

  cachedClient = axios.create({
    baseURL,
    timeout,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'X-API-Key': apiKey,
    },
  });
  cachedClient.interceptors.request.use((config) => {
    const userId = currentUserId();
    if (userId) config.headers.set(AI_USER_HEADER, userId);
    return config;
  });
  cachedSignature = signature;
  return cachedClient;
}
