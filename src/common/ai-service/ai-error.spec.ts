import { HttpException, Logger } from '@nestjs/common';
import { toAiHttpException } from './ai-error.js';
import { PersonalAiService } from '../../personal-ai/personal-ai.service.js';
import { AiTutorService } from '../../ai-tutor/ai-tutor.service.js';
import * as aiHttp from './ai-http.client.js';

describe('toAiHttpException', () => {
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  const upstream = (status: number, detail: unknown) => ({ response: { status, data: { detail } } });

  const withHeaders = (status: number, detail: unknown, headers: Record<string, string>) => ({ response: { status, data: { detail }, headers } });

  it.each([
    [upstream(400, 'Invalid YouTube URL.'), 400, 'Invalid YouTube URL.', undefined, undefined],
    [upstream(413, 'Document is too large to process.'), 413, 'Document is too large to process.', undefined, undefined],
    [upstream(400, 'Failed to fetch document content: 401 Client Error for url https://res.cloudinary.com/x'), 400, 'The document could not be downloaded for processing.', undefined, undefined],
    // the backend's AI key was rejected: an operator problem, never shown as the learner's rate limit
    [upstream(401, 'Unauthorized AI token'), 503, 'AI features are temporarily unavailable. Please try again later.', 'AI_UNAVAILABLE', undefined],
    [upstream(502, 'NVIDIA AI generation failed: Error code: 500 - provider internals'), 502, 'AI generation failed. Please try again later.', 'AI_FAILED', undefined],
    [upstream(429, 'Rate limit exceeded: 5 per 1 minute'), 429, "You've reached the AI request limit for now. Please wait 60 seconds and try again.", 'AI_RATE_LIMITED', 60],
    [withHeaders(429, { code: 'AI_RATE_LIMITED' }, { 'retry-after': '12' }), 429, "You've reached the AI request limit for now. Please wait 12 seconds and try again.", 'AI_RATE_LIMITED', 12],
    [withHeaders(503, { code: 'AI_PROVIDER_RATE_LIMITED', message: 'x' }, { 'retry-after': '20' }), 503, 'The AI provider is busy right now. Please try again in a moment.', 'AI_PROVIDER_BUSY', 20],
    [upstream(503, { code: 'AI_PROVIDER_QUOTA_EXHAUSTED', message: 'x' }), 503, "GleamLearn's AI has reached its usage limit with our AI provider. Please try again later.", 'AI_PROVIDER_QUOTA', undefined],
    [upstream(502, { code: 'AI_PROVIDER_AUTH', message: 'x' }), 503, 'AI features are temporarily unavailable. Please try again later.', 'AI_UNAVAILABLE', undefined],
    [upstream(404, { detail: 'Not Found' }), 404, 'The requested AI resource was not found.', undefined, undefined],
    [{ code: 'ECONNABORTED', message: 'timeout of 120000ms exceeded' }, 504, 'The AI service took too long to respond. Please try again.', 'AI_TIMEOUT', undefined],
    [{ code: 'ECONNREFUSED', message: 'connect ECONNREFUSED 127.0.0.1:8000' }, 503, 'The AI service is currently unavailable. Please try again later.', 'AI_UNAVAILABLE', undefined],
  ])('maps %o to %i', (error, status, message, code, retryAfter) => {
    const ex = toAiHttpException(error, 'test');
    expect(ex.getStatus()).toBe(status);
    const body = ex.getResponse() as any;
    expect(typeof body === 'string' ? body : body.message).toBe(message);
    if (code) expect(body).toMatchObject({ statusCode: status, code });
    expect(typeof body === 'string' ? undefined : body.retryAfterSeconds).toBe(retryAfter);
  });

  it('passes existing HttpExceptions through unchanged', () => {
    const original = new HttpException('Conversation not found', 404);
    expect(toAiHttpException(original, 'test')).toBe(original);
  });

  it('logs diagnostics without request headers or credentials', () => {
    const error = {
      response: { status: 502, data: { detail: 'provider down' } },
      config: { headers: { Authorization: 'Bearer super-secret-key', 'X-API-Key': 'super-secret-key' }, data: '{"message":"private user text"}' },
    };
    toAiHttpException(error, 'chat');
    const logged = warn.mock.calls.map((c) => String(c[0])).join('\n');
    expect(logged).toContain('upstreamStatus=502');
    expect(logged).not.toContain('super-secret-key');
    expect(logged).not.toContain('private user text');
  });
});

describe('AI failures are never reported as successes', () => {
  const post = vi.fn();
  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    post.mockReset();
    vi.spyOn(aiHttp, 'getAiHttpClient').mockReturnValue({ post } as any);
  });
  afterEach(() => vi.restoreAllMocks());

  function personalAi() {
    const conversationRepo = { findOne: vi.fn(), create: vi.fn((x: any) => ({ id: 'c1', ...x })), save: vi.fn(async (x: any) => x) };
    const messageRepo = { create: vi.fn((x: any) => x), save: vi.fn(async (x: any) => x) };
    return { conversationRepo, messageRepo, service: new PersonalAiService(conversationRepo as any, messageRepo as any) };
  }

  it('personal AI chat fails with 503 and persists nothing when the AI service is down', async () => {
    post.mockRejectedValue({ code: 'ECONNREFUSED', message: 'connect ECONNREFUSED' });
    const { service, conversationRepo, messageRepo } = personalAi();
    await expect(service.chat('u1', 'hello')).rejects.toMatchObject({ status: 503 });
    expect(conversationRepo.save).not.toHaveBeenCalled();
    expect(messageRepo.save).not.toHaveBeenCalled();
  });

  it('personal AI chat keeps its success contract when the AI responds', async () => {
    post.mockResolvedValue({ data: { message: 'Hi there' } });
    const { service, messageRepo } = personalAi();
    const res = await service.chat('u1', 'hello');
    expect(res.status).toBe('success');
    expect(res.data.aiMessage.content).toBe('Hi there');
    expect(messageRepo.save).toHaveBeenCalledTimes(2);
  });

  it('personal AI tools no longer return { status: success, fallback: true } on failure', async () => {
    post.mockRejectedValue({ response: { status: 502, data: { detail: 'NVIDIA AI generation failed: x' } } });
    const { service } = personalAi();
    await expect(service.explainConcept('cells')).rejects.toMatchObject({ status: 502 });
  });

  it('AI tutor does not save an unanswered message when the AI fails, and rejects empty replies', async () => {
    const sessionRepo = { findOne: vi.fn().mockResolvedValue({ id: 's1', userId: 'u1' }) };
    const messageRepo = { create: vi.fn((x: any) => x), save: vi.fn(async (x: any) => x) };
    const service = new AiTutorService(sessionRepo as any, messageRepo as any);

    post.mockRejectedValue({ code: 'ECONNABORTED', message: 'timeout' });
    await expect(service.addMessage('s1', 'u1', 'Explain gravity')).rejects.toMatchObject({ status: 504 });
    expect(messageRepo.save).not.toHaveBeenCalled();

    post.mockReset().mockResolvedValue({ data: { response: '' } });
    await expect(service.addMessage('s1', 'u1', 'Explain gravity')).rejects.toMatchObject({ status: 502 });
    expect(messageRepo.save).not.toHaveBeenCalled();
  });
});
