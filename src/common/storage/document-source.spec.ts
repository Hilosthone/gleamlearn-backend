import { BadRequestException, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { isTrustedStorageUrl } from './trusted-storage-url.js';
import { resolveDocumentPayload } from './document-source.js';
import { QuizzesService } from '../../quizzes/quizzes.service.js';
import { TestsService } from '../../tests/tests.service.js';
import { ExamsService } from '../../exams/exams.service.js';
import { AiService } from '../../ai/ai.service.js';
import * as aiHttp from '../ai-service/ai-http.client.js';

const CLOUD = 'gleamlearn-test';
const TRUSTED = `https://res.cloudinary.com/${CLOUD}/raw/upload/v1/gleamlearn-files/notes.pdf`;
const FILE_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

describe('isTrustedStorageUrl', () => {
  it('accepts only https URLs on this project\'s Cloudinary cloud', () => {
    expect(isTrustedStorageUrl(TRUSTED, CLOUD)).toBe(true);
  });

  it.each([
    ['other cloud', `https://res.cloudinary.com/someone-else/raw/upload/x.pdf`],
    ['plain http', `http://res.cloudinary.com/${CLOUD}/raw/upload/x.pdf`],
    ['look-alike host', `https://res.cloudinary.com.evil.example/${CLOUD}/x.pdf`],
    ['userinfo trick', `https://res.cloudinary.com@evil.example/${CLOUD}/x.pdf`],
    ['internal address', 'http://169.254.169.254/latest/meta-data/'],
    ['localhost', 'http://127.0.0.1:8000/api/v1/chat'],
    ['explicit port', `https://res.cloudinary.com:8443/${CLOUD}/x.pdf`],
    ['cloud name only as prefix', `https://res.cloudinary.com/${CLOUD}-fake/x.pdf`],
    ['not a URL', 'file:///etc/passwd'],
    ['empty', ''],
  ])('rejects %s', (_label, url) => {
    expect(isTrustedStorageUrl(url, CLOUD)).toBe(false);
  });

  it('trusts nothing when the cloud name is not configured (fail-closed)', () => {
    expect(isTrustedStorageUrl(TRUSTED, '')).toBe(false);
    expect(isTrustedStorageUrl(TRUSTED, undefined)).toBe(false);
  });
});

describe('resolveDocumentPayload', () => {
  const saved = process.env.CLOUDINARY_CLOUD_NAME;
  beforeEach(() => {
    process.env.CLOUDINARY_CLOUD_NAME = CLOUD;
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    process.env.CLOUDINARY_CLOUD_NAME = saved;
    vi.restoreAllMocks();
  });

  it('valid file: uses the stored URL and ignores any client-supplied URL', async () => {
    const load = vi.fn().mockResolvedValue({ id: FILE_ID, url: TRUSTED });
    const out = await resolveDocumentPayload({ fileId: FILE_ID, fileUrl: 'http://169.254.169.254/', topic: 'Cells' }, load);
    expect(load).toHaveBeenCalledWith(FILE_ID);
    expect(out).toMatchObject({ fileId: FILE_ID, fileUrl: TRUSTED, topic: 'Cells' });
  });

  it('accepts the legacy documentId field', async () => {
    const load = vi.fn().mockResolvedValue({ id: FILE_ID, url: TRUSTED });
    await expect(resolveDocumentPayload({ documentId: FILE_ID }, load)).resolves.toMatchObject({ fileId: FILE_ID });
  });

  it('URL-only request: rejected without fetching anything', async () => {
    const load = vi.fn();
    await expect(resolveDocumentPayload({ fileUrl: TRUSTED }, load)).rejects.toBeInstanceOf(BadRequestException);
    expect(load).not.toHaveBeenCalled();
  });

  it('unauthorized or missing file: the access check error propagates (404)', async () => {
    const load = vi.fn().mockRejectedValue(new NotFoundException('File record not found'));
    await expect(resolveDocumentPayload({ fileId: FILE_ID }, load)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('stored file on an untrusted host: refused with 422', async () => {
    const load = vi.fn().mockResolvedValue({ id: FILE_ID, url: 'https://evil.example/doc.pdf' });
    await expect(resolveDocumentPayload({ fileId: FILE_ID }, load)).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});

describe('generate-from-document and AI document pipeline never forward client URLs', () => {
  const post = vi.fn();
  const saved = process.env.CLOUDINARY_CLOUD_NAME;
  const files = { findFileById: vi.fn() };
  const config = { get: vi.fn((_k: string, d?: string) => d) };

  beforeEach(() => {
    process.env.CLOUDINARY_CLOUD_NAME = CLOUD;
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    post.mockReset().mockResolvedValue({ data: { status: 'success' } });
    files.findFileById.mockReset().mockResolvedValue({ id: FILE_ID, url: TRUSTED });
    vi.spyOn(aiHttp, 'getAiHttpClient').mockReturnValue({ post } as any);
  });
  afterEach(() => {
    process.env.CLOUDINARY_CLOUD_NAME = saved;
    vi.restoreAllMocks();
  });

  const services = () => [
    ['quizzes', new QuizzesService({} as any, config as any, {} as any, {} as any, files as any)],
    ['tests', new TestsService({} as any, config as any, files as any)],
    ['exams', new ExamsService({} as any, config as any, files as any)],
  ] as const;

  it('sends the stored trusted URL for a valid file', async () => {
    for (const [name, svc] of services()) {
      post.mockClear();
      await svc.generateFromDocument({ fileId: FILE_ID, fileUrl: 'http://127.0.0.1:8000/' });
      expect(post).toHaveBeenCalledWith(`/api/v1/${name}/generate-from-document`, expect.objectContaining({ fileId: FILE_ID, fileUrl: TRUSTED }));
    }
  });

  it('rejects URL-only requests and untrusted stored URLs without calling the AI service', async () => {
    for (const [, svc] of services()) {
      await expect(svc.generateFromDocument({ fileUrl: TRUSTED })).rejects.toBeInstanceOf(BadRequestException);
    }
    files.findFileById.mockResolvedValue({ id: FILE_ID, url: 'https://evil.example/x.pdf' });
    for (const [, svc] of services()) {
      await expect(svc.generateFromDocument({ fileId: FILE_ID })).rejects.toBeInstanceOf(UnprocessableEntityException);
    }
    expect(post).not.toHaveBeenCalled();
  });

  it('AI document endpoints refuse a stored URL on an untrusted host', async () => {
    files.findFileById.mockResolvedValue({ id: FILE_ID, url: 'http://169.254.169.254/latest' });
    const ai = new AiService(files as any);
    await expect(ai.generateSummary(FILE_ID)).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(post).not.toHaveBeenCalled();
  });
});
