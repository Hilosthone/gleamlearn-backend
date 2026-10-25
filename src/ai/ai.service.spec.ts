import { NotFoundException } from '@nestjs/common';
import { AiService } from './ai.service.js';
import * as aiHttp from '../common/ai-service/ai-http.client.js';

describe('AiService document pipeline mapping', () => {
  const post = vi.fn();
  const get = vi.fn();

  const savedCloud = process.env.CLOUDINARY_CLOUD_NAME;
  beforeAll(() => {
    process.env.CLOUDINARY_CLOUD_NAME = 'demo'; // fixture URLs below are on res.cloudinary.com/demo
  });
  afterAll(() => {
    process.env.CLOUDINARY_CLOUD_NAME = savedCloud;
  });

  beforeEach(() => {
    post.mockReset().mockResolvedValue({ data: { status: 'success' } });
    get.mockReset().mockResolvedValue({ data: { status: 'success' } });
    vi.spyOn(aiHttp, 'getAiHttpClient').mockReturnValue({ post, get } as any);
  });

  afterEach(() => vi.restoreAllMocks());

  function build(file: any = { id: 'file-1', url: 'https://res.cloudinary.com/demo/raw/upload/doc.pdf' }) {
    const filesService = {
      findFileById: vi.fn(async (id: string) => {
        if (!file) throw new NotFoundException('File record not found');
        return { ...file, id };
      }),
    };
    return { service: new AiService(filesService as any), filesService };
  }

  it('calls the AI service /api/v1/ai/documents path with fileId, fileUrl and options', async () => {
    const { service } = build();
    await service.generateSummary('file-1', { tone: 'CONCISE' as any });
    expect(post).toHaveBeenCalledWith('/api/v1/ai/documents/file-1/generate-summary', {
      fileId: 'file-1',
      fileUrl: 'https://res.cloudinary.com/demo/raw/upload/doc.pdf',
      options: { tone: 'CONCISE' },
    });
  });

  it('uses the corrected path for every generation action', async () => {
    const { service } = build();
    await service.analyzeDocument('f');
    await service.generateNotes('f');
    await service.generateFlashcards('f');
    await service.generateQuestions('f');
    await service.generateQuiz('f');
    await service.generateTest('f');
    await service.generateExam('f');
    await service.createCourseFromDocument('f');
    await service.generateLiveClass('f');
    const paths = post.mock.calls.map((c) => c[0]);
    expect(paths.every((p: string) => p.startsWith('/api/v1/ai/documents/f/'))).toBe(true);
    expect(paths).toHaveLength(9);
  });

  // These used to be forwarded to AI-service stubs (empty "success", or a fabricated PDF URL). They are now
  // refused with 501 FEATURE_UNAVAILABLE before any call (see common/errors/feature-unavailable.spec.ts).
  it('does not call the AI service for saved analysis, saved content, live stream or PDF export', async () => {
    const { service } = build();
    for (const call of [service.getAnalysis('f'), service.getAllGeneratedContent('f'), service.getLiveClassStream('f'), service.exportPdf('f')]) {
      await expect(call).rejects.toMatchObject({ status: 501 });
    }
    expect(get).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });

  it('returns 404 without calling the AI service when the file does not exist', async () => {
    const { service } = build(null);
    await expect(service.generateQuiz('missing')).rejects.toBeInstanceOf(NotFoundException);
    expect(post).not.toHaveBeenCalled();
  });

  it('keeps meaningful upstream statuses with safe messages', async () => {
    post.mockRejectedValue({ response: { status: 415, data: { detail: 'Unsupported document type. Upload a PDF, DOCX or text file.' } } });
    const { service } = build();
    await expect(service.generateNotes('f')).rejects.toMatchObject({
      status: 415,
      message: 'Unsupported document type. Upload a PDF, DOCX or text file.',
    });
  });

  it('hides schema and provider errors behind a generic 502', async () => {
    post.mockRejectedValue({ response: { status: 422, data: { detail: [{ loc: ['body', 'fileUrl'], msg: 'Field required' }] } } });
    const { service } = build();
    await expect(service.generateNotes('f')).rejects.toMatchObject({ status: 502, message: 'AI generation failed. Please try again later.' });
  });
});
