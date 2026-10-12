import { NotFoundException } from '@nestjs/common';
import { YoutubeTranscript } from 'youtube-transcript';
import { YoutubeService } from './youtube.service.js';
import * as aiHttp from '../common/ai-service/ai-http.client.js';

const RES_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const OWNER = 'owner-user-id';
const OTHER = 'other-user-id';

// Minimal in-memory repository that honours the { id, userId } filter like TypeORM would
function makeRepo(rows: any[]) {
  return {
    findOne: vi.fn(async ({ where }: any) =>
      rows.find((r) => Object.entries(where).every(([k, v]) => r[k] === v)) ?? null,
    ),
    find: vi.fn(async ({ where }: any) => rows.filter((r) => r.userId === where.userId)),
    save: vi.fn(async (r: any) => r),
    remove: vi.fn(async (r: any) => {
      rows.splice(rows.indexOf(r), 1);
      return r;
    }),
  };
}

describe('YoutubeService.processYoutubeResource transcript handling', () => {
  const post = vi.fn();
  let resource: any;
  let repo: any;

  beforeEach(() => {
    delete process.env.YOUTUBE_API_KEY;
    resource = { id: RES_ID, userId: OWNER, videoId: 'dQw4w9WgXcQ', videoUrl: 'https://youtu.be/dQw4w9WgXcQ', status: 'PENDING' };
    repo = makeRepo([resource]);
    post.mockReset().mockResolvedValue({ data: { generatedContent: { title: 'Video' } } });
    vi.spyOn(aiHttp, 'getAiHttpClient').mockReturnValue({ post } as any);
  });

  afterEach(() => vi.restoreAllMocks());

  it('sends the transcript fetched by the backend so the AI service does not refetch it', async () => {
    vi.spyOn(YoutubeTranscript, 'fetchTranscript').mockResolvedValue([{ text: 'hello' }, { text: 'world' }] as any);
    const result = await new YoutubeService(repo).processYoutubeResource(RES_ID, OWNER);
    expect(post).toHaveBeenCalledWith(`/api/v1/youtube/${RES_ID}/process`, {
      url: 'https://youtu.be/dQw4w9WgXcQ',
      transcript: 'hello world',
    });
    expect(result.status).toBe('COMPLETED');
    expect(result.rawTranscript).toBe('hello world');
  });

  it('falls back to the AI service fetching the transcript when the backend fetch fails', async () => {
    vi.spyOn(YoutubeTranscript, 'fetchTranscript').mockRejectedValue(new Error('blocked by YouTube'));
    const result = await new YoutubeService(repo).processYoutubeResource(RES_ID, OWNER);
    expect(post).toHaveBeenCalledWith(`/api/v1/youtube/${RES_ID}/process`, { url: 'https://youtu.be/dQw4w9WgXcQ' });
    expect(result.status).toBe('COMPLETED');
  });

  it('marks the resource FAILED when the AI service fails', async () => {
    vi.spyOn(YoutubeTranscript, 'fetchTranscript').mockResolvedValue([] as any);
    post.mockRejectedValue({ response: { status: 400, data: { detail: 'No transcript could be retrieved for this video.' } } });
    await expect(new YoutubeService(repo).processYoutubeResource(RES_ID, OWNER)).rejects.toMatchObject({
      status: 400,
      message: 'Failed to process YouTube video: No transcript could be retrieved for this video.',
    });
    expect(resource.status).toBe('FAILED');
  });

  it('stores only a safe message when the provider fails', async () => {
    vi.spyOn(YoutubeTranscript, 'fetchTranscript').mockResolvedValue([] as any);
    post.mockRejectedValue({ response: { status: 502, data: { detail: 'NVIDIA AI generation failed: upstream 500 at https://integrate.api.nvidia.com' } } });
    await expect(new YoutubeService(repo).processYoutubeResource(RES_ID, OWNER)).rejects.toMatchObject({ status: 502 });
    expect(resource.processingError).toBe('AI generation failed. Please try again later.');
    expect(resource.processingError).not.toContain('nvidia');
  });
});

describe('YoutubeService ownership', () => {
  let resource: any;
  let repo: any;
  let service: YoutubeService;
  const post = vi.fn();

  beforeEach(() => {
    resource = { id: RES_ID, userId: OWNER, videoId: 'dQw4w9WgXcQ', videoUrl: 'https://youtu.be/dQw4w9WgXcQ', status: 'COMPLETED', processingError: '' };
    repo = makeRepo([resource]);
    service = new YoutubeService(repo);
    post.mockReset();
    vi.spyOn(aiHttp, 'getAiHttpClient').mockReturnValue({ post } as any);
  });

  afterEach(() => vi.restoreAllMocks());

  it('lets the owner read, check status and delete', async () => {
    await expect(service.findById(RES_ID, OWNER)).resolves.toBe(resource);
    await expect(service.getStatus(RES_ID, OWNER)).resolves.toMatchObject({ id: RES_ID, status: 'COMPLETED' });
    await expect(service.deleteResource(RES_ID, OWNER)).resolves.toEqual({ message: 'YouTube resource successfully deleted' });
    expect(repo.remove).toHaveBeenCalledWith(resource);
  });

  it.each([
    ['findById', (s: YoutubeService) => s.findById(RES_ID, OTHER)],
    ['getStatus', (s: YoutubeService) => s.getStatus(RES_ID, OTHER)],
    ['deleteResource', (s: YoutubeService) => s.deleteResource(RES_ID, OTHER)],
    ['processYoutubeResource', (s: YoutubeService) => s.processYoutubeResource(RES_ID, OTHER)],
    ['reprocessYoutubeResource', (s: YoutubeService) => s.reprocessYoutubeResource(RES_ID, OTHER)],
  ])('%s returns the same 404 for another user and changes nothing', async (_name, call) => {
    await expect(call(service)).rejects.toThrow(new NotFoundException('YouTube resource not found'));
    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: RES_ID, userId: OTHER } });
    expect(repo.save).not.toHaveBeenCalled();
    expect(repo.remove).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
    expect(resource.status).toBe('COMPLETED');
  });

  it('treats malformed ids and a missing user as not found without querying', async () => {
    await expect(service.findById('not-a-uuid', OWNER)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.findById(RES_ID, '')).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.findOne).not.toHaveBeenCalled();
  });

  it('lists only the requesting user\'s resources', async () => {
    const rows = [resource, { ...resource, id: 'x', userId: OTHER }];
    const listRepo = makeRepo(rows);
    (listRepo.find as any).mockImplementation(async ({ where }: any) => rows.filter((r) => r.userId === where.userId));
    const list = await new YoutubeService(listRepo as any).findAllForUser(OWNER);
    expect(list.map((r: any) => r.userId)).toEqual([OWNER]);
  });
});
