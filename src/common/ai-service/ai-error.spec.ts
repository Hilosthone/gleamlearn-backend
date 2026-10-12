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

  it.each([
    [upstream(400, 'Invalid YouTube URL.'), 400, 'Invalid YouTube URL.'],
    [upstream(413, 'Document is too large to process.'), 413, 'Document is too large to process.'],
    [upstream(400, 'Failed to fetch document content: 401 Client Error for url https://res.cloudinary.com/x'), 400, 'The document could not be downloaded for processing.'],
    [upstream(401, 'Unauthorized AI token'), 502, 'AI generation failed. Please try again later.'],
    [upstream(502, 'NVIDIA AI generation failed: Error code: 500 - provider internals'), 502, 'AI generation failed. Please try again later.'],
    [upstream(429, 'Rate limit exceeded: 5 per 1 minute'), 429, 'The AI service is busy. Please try again shortly.'],
    [upstream(404, { detail: 'Not Found' }), 404, 'The requested AI resource was not found.'],
    [{ code: 'ECONNABORTED', message: 'timeout of 120000ms exceeded' }, 504, 'The AI service took too long to respond. Please try again.'],
    [{ code: 'ECONNREFUSED', message: 'connect ECONNREFUSED 127.0.0.1:8000' }, 503, 'The AI service is currently unavailable. Please try again later.'],
  ])('maps %o to %i', (error, status, message) => {
    const ex = toAiHttpException(error, 'test');
    expect(ex.getStatus()).toBe(status);
    expect(ex.getResponse()).toBe(message); // Nest serializes this as { statusCode, message }
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
