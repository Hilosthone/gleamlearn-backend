import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import {
  AI_SERVICE_BUDGET_MS,
  AI_TIMEOUT_HEADROOM_MS,
  DEFAULT_AI_HTTP_TIMEOUT_MS,
  aiHttpTimeoutMs,
  failureCategory,
  getAiHttpClient,
} from './ai-http.client.js';
import { toAiHttpException } from './ai-error.js';
import { RequestContextInterceptor, isAiRoute, requestIdFrom, runWithContext } from '../request-context.js';

/**
 * Tracing between the backend and the AI service, against a real local HTTP server standing in for FastAPI:
 * request ids, safe logs, slow and stopped servers, and the timeout relationship with the AI service's budget.
 */
const SECRET = 'learner private question 5d1e';
const KEY = 'unit-test-ai-key';

type Seen = { headers: http.IncomingHttpHeaders; body: string };
let server: http.Server;
let base = '';
let seen: Seen[] = [];
let behaviour: (req: http.IncomingMessage, res: http.ServerResponse) => void;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      seen.push({ headers: req.headers, body });
      behaviour(req, res);
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));

const saved = { ...process.env };
let logs: string[];
beforeEach(() => {
  seen = [];
  logs = [];
  behaviour = (_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'success', message: 'mock answer' }));
  };
  process.env.AI_SERVICE_URL = base;
  process.env.AI_API_KEY = KEY;
  delete process.env.AI_HTTP_TIMEOUT_MS;
  vi.spyOn(Logger.prototype, 'log').mockImplementation((m: unknown) => void logs.push(String(m)));
  vi.spyOn(Logger.prototype, 'warn').mockImplementation((m: unknown) => void logs.push(String(m)));
});
afterEach(() => {
  process.env = { ...saved };
  vi.restoreAllMocks();
});

const chat = () => getAiHttpClient().post('/api/v1/chat', { message: SECRET });

describe('request ids reach the AI service', () => {
  it('sends the request’s id and learner with each call', async () => {
    await runWithContext({ requestId: 'req-1234abcd', userId: 'learner-1' }, chat);
    expect(seen[0].headers['x-request-id']).toBe('req-1234abcd');
    expect(seen[0].headers['x-gleamlearn-user']).toBe('learner-1');
  });

  it('makes an id for calls outside a request (background work)', async () => {
    await chat();
    expect(seen[0].headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('concurrent requests keep their own ids', async () => {
    behaviour = (_req, res) => setTimeout(() => res.end('{"message":"ok"}'), 50);
    await Promise.all(['req-aaaaaaaa', 'req-bbbbbbbb', 'req-cccccccc'].map((id) => runWithContext({ requestId: id }, chat)));
    expect(seen.map((s) => s.headers['x-request-id']).sort()).toEqual(['req-aaaaaaaa', 'req-bbbbbbbb', 'req-cccccccc']);
  });

  it('accepts only short, plain ids from callers', () => {
    expect(requestIdFrom('abc-123_x.y')).toBe('abc-123_x.y');
    expect(requestIdFrom('has spaces in it')).toMatch(/^[0-9a-f-]{36}$/);
    expect(requestIdFrom('x'.repeat(65))).toMatch(/^[0-9a-f-]{36}$/);
    expect(requestIdFrom(undefined)).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('logs: start, end, duration and category — no content or keys', () => {
  it('logs a completed call', async () => {
    await runWithContext({ requestId: 'req-log00001' }, chat);
    const text = logs.join('\n');
    expect(text).toContain('ai.call.start id=req-log00001 POST /api/v1/chat');
    expect(text).toMatch(/ai\.call\.completed id=req-log00001 POST \/api\/v1\/chat status=200 ms=\d+/);
    expect(text).not.toContain(SECRET);
    expect(text).not.toContain(KEY);
    expect(text).not.toContain(base); // no internal URL
  });

  it('a slow AI service: our timeout → 504 AI_TIMEOUT, logged as a timeout with its duration', async () => {
    process.env.AI_HTTP_TIMEOUT_MS = '300';
    behaviour = (_req, res) => setTimeout(() => res.end('{"message":"late"}'), 1500);
    const err = await runWithContext({ requestId: 'req-slow0001' }, chat).catch((e) => e);
    const mapped = toAiHttpException(err, 'AI personal assistant chat');
    expect(mapped.getStatus()).toBe(504);
    expect(mapped.getResponse()).toMatchObject({ code: 'AI_TIMEOUT' });
    const text = logs.join('\n');
    expect(text).toMatch(/ai\.call\.failed id=req-slow0001 POST \/api\/v1\/chat category=timeout ms=\d+/);
    expect(text).toMatch(/AI personal assistant chat failed: id=req-slow0001 .*category=timeout returned=504 ms=\d+/);
    expect(text).not.toContain(SECRET);
  });

  it('a stopped AI service: connection refused → 503 AI_UNAVAILABLE', async () => {
    const dead = http.createServer();
    await new Promise<void>((r) => dead.listen(0, '127.0.0.1', r));
    const port = (dead.address() as AddressInfo).port;
    await new Promise<void>((r) => dead.close(() => r()));
    process.env.AI_SERVICE_URL = `http://127.0.0.1:${port}`;
    const err = await chat().catch((e) => e);
    expect(failureCategory(err)).toBe('connection_refused');
    const mapped = toAiHttpException(err, 'AI chat');
    expect(mapped.getStatus()).toBe(503);
    expect(mapped.getResponse()).toMatchObject({ code: 'AI_UNAVAILABLE' });
    expect(logs.join('\n')).toContain('category=connection_refused');
  });

  it('coded AI-service errors keep their existing mappings', async () => {
    const cases: Array<[number, unknown, number, string]> = [
      [504, { code: 'AI_PROVIDER_TIMEOUT', message: 'x' }, 504, 'AI_TIMEOUT'],
      [503, { code: 'AI_PROVIDER_RATE_LIMITED', message: 'x' }, 503, 'AI_PROVIDER_BUSY'],
      [503, { code: 'AI_PROVIDER_QUOTA_EXHAUSTED', message: 'x' }, 503, 'AI_PROVIDER_QUOTA'],
      [429, { code: 'AI_RATE_LIMITED', message: 'x', retryAfterSeconds: 9 }, 429, 'AI_RATE_LIMITED'],
    ];
    for (const [status, detail, expected, code] of cases) {
      behaviour = (_req, res) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ detail }));
      };
      const err = await chat().catch((e) => e);
      expect(failureCategory(err)).toBe(`http_${status}:${(detail as { code: string }).code}`);
      const mapped = toAiHttpException(err, 'AI chat');
      expect(mapped.getStatus()).toBe(expected);
      expect(mapped.getResponse()).toMatchObject({ code });
    }
  });
});

describe('timeout coordination with the AI service', () => {
  it('the default waits longer than the AI service’s budget plus network headroom', () => {
    expect(aiHttpTimeoutMs({})).toBe(DEFAULT_AI_HTTP_TIMEOUT_MS);
    expect(DEFAULT_AI_HTTP_TIMEOUT_MS).toBeGreaterThanOrEqual(AI_SERVICE_BUDGET_MS + AI_TIMEOUT_HEADROOM_MS);
  });

  it('warns at startup when AI_HTTP_TIMEOUT_MS is set too low', () => {
    process.env.AI_HTTP_TIMEOUT_MS = '90000';
    getAiHttpClient();
    expect(logs.join('\n')).toContain('AI_HTTP_TIMEOUT_MS=90000 is below');
  });
});

describe('RequestContextInterceptor', () => {
  const ctx = (path: string, headers: Record<string, string> = {}) => {
    const res = { statusCode: 201, headers: {} as Record<string, string>, setHeader(k: string, v: string) { this.headers[k] = v; } };
    const req = { method: 'POST', originalUrl: path, headers, user: { id: 'learner-9' } };
    return { res, context: { getType: () => 'http', switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }) } as never };
  };

  it('returns the request id and logs AI routes (received, completed)', async () => {
    const { res, context } = ctx('/api/v1/ai/chat', { 'x-request-id': 'client-1234abcd' });
    const value = await new Promise((resolve) => new RequestContextInterceptor().intercept(context, { handle: () => of('ok') }).subscribe({ next: resolve }));
    expect(value).toBe('ok');
    expect(res.headers['X-Request-Id']).toBe('client-1234abcd');
    const text = logs.join('\n');
    expect(text).toContain('ai.route.received id=client-1234abcd POST /api/v1/ai/chat');
    expect(text).toMatch(/ai\.route\.completed id=client-1234abcd POST \/api\/v1\/ai\/chat status=201 ms=\d+/);
  });

  it('logs failures with status and code', async () => {
    const { context } = ctx('/api/v1/learning/generate');
    const failure = toAiHttpException({ code: 'ECONNABORTED', message: 'timeout of 120000ms exceeded' }, 'Learning');
    await new Promise((resolve) => new RequestContextInterceptor().intercept(context, { handle: () => throwError(() => failure) }).subscribe({ error: resolve }));
    expect(logs.join('\n')).toMatch(/ai\.route\.failed id=\S+ POST \/api\/v1\/learning\/generate status=504 code=AI_TIMEOUT ms=\d+/);
  });

  it('runs the handler with the learner and the id in context; other routes are not logged', async () => {
    const { res, context } = ctx('/api/v1/courses');
    const seenCtx = await new Promise<{ id?: string }>((resolve) =>
      new RequestContextInterceptor()
        .intercept(context, { handle: () => of(null) })
        .subscribe({ complete: () => resolve({ id: res.headers['X-Request-Id'] }) }),
    );
    expect(seenCtx.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(logs.join('\n')).not.toContain('ai.route');
  });

  it('knows which routes call the AI service', () => {
    for (const p of ['/api/v1/ai/chat', '/api/v1/ai-tutor/sessions/x/message', '/api/v1/learning/generate', '/api/v1/youtube-sessions/x/ask', '/api/v1/quizzes/generate-from-topic', '/api/v1/youtube/x/process']) {
      expect(isAiRoute(p)).toBe(true);
    }
    for (const p of ['/api/v1/courses', '/api/v1/learning/resources', '/api/v1/quizzes', '/api/v1/health/ai']) expect(isAiRoute(p)).toBe(false);
  });
});
