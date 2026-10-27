import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { YoutubeTranscript } from 'youtube-transcript';
import { getAiHttpClient } from '../common/ai-service/ai-http.client.js';
import { toAiHttpException } from '../common/ai-service/ai-error.js';
import { withTable } from '../common/errors/missing-table.js';
import { PersonalCourse } from '../learner-content/entities.js';
import { YoutubeEntity } from '../youtube/entities/youtube.entity.js';
import { YoutubeSessionMessage } from './entities.js';
import { formatTimestamp, parseTimestamp, transcriptStamps, verifyCitations } from './grading.js';

const FEATURE = 'YouTube learning sessions';
const MAX_TRANSCRIPT_CHARS = 200_000;
const HISTORY_TURNS = 12;

/** Session details kept in youtube_resources.structuredMaterial.session (no schema change to that table). */
export interface SessionMeta {
  goal?: string | null;
  level?: string | null;
  subject?: string | null;
  personalCourseId?: string | null;
  author?: string | null;
  embeddable?: boolean | null;
  transcriptSource?: 'youtube' | 'learner' | null;
}

/** Accepts watch, youtu.be, shorts, embed and live URLs; returns the 11-character video id or null. */
export function videoIdFrom(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\.|^music\./, '');
  let id: string | null = null;
  if (host === 'youtu.be') id = url.pathname.slice(1).split('/')[0];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') id = url.searchParams.get('v');
    else {
      const m = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/);
      id = m ? m[1] : null;
    }
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

export const canonicalUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;

/** youtube-transcript returns offsets in ms (srv3) or seconds (classic). Fractions mean seconds. */
export function toTranscriptLines(items: { text: string; offset: number }[]): string {
  const ms = items.length > 0 && items.every((i) => Number.isInteger(i.offset)) && items.some((i) => i.offset >= 1000);
  return items
    .map((i) => ({ s: ms ? i.offset / 1000 : i.offset, text: String(i.text ?? '').replace(/\s+/g, ' ').trim() }))
    .filter((i) => i.text)
    .map((i) => `[${formatTimestamp(i.s)}] ${i.text}`)
    .join('\n')
    .slice(0, MAX_TRANSCRIPT_CHARS);
}

export interface TranscriptSegment {
  start: number;
  text: string;
}

export function segmentsOf(transcript: string | null | undefined): TranscriptSegment[] {
  const out: TranscriptSegment[] = [];
  for (const line of (transcript ?? '').split('\n')) {
    const m = line.match(/^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s?(.*)$/);
    const s = m ? parseTimestamp(m[1]) : null;
    if (m && s !== null) out.push({ start: s, text: m[2] });
  }
  return out;
}

@Injectable()
export class YoutubeSessionsService {
  private readonly logger = new Logger(YoutubeSessionsService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(YoutubeEntity) private readonly sessions: Repository<YoutubeEntity>,
    @InjectRepository(YoutubeSessionMessage) private readonly messages: Repository<YoutubeSessionMessage>,
  ) {}

  private network() {
    return (process.env.YOUTUBE_NETWORK ?? 'on').toLowerCase() !== 'off'; // off in the disposable e2e stack
  }

  private async own(userId: string, id: string) {
    const s = await this.sessions.findOne({ where: { id, userId } });
    if (!s) throw new NotFoundException('YouTube session not found.');
    return s;
  }

  private meta(s: YoutubeEntity): SessionMeta {
    return ((s.structuredMaterial as { session?: SessionMeta } | null)?.session ?? {}) as SessionMeta;
  }

  view(s: YoutubeEntity) {
    const meta = this.meta(s);
    const segments = segmentsOf(s.rawTranscript);
    return {
      id: s.id,
      videoId: s.videoId,
      url: canonicalUrl(s.videoId),
      title: s.title || `YouTube video ${s.videoId}`,
      channelTitle: s.channelTitle ?? meta.author ?? null,
      thumbnailUrl: s.thumbnailUrl ?? `https://i.ytimg.com/vi/${s.videoId}/hqdefault.jpg`,
      goal: meta.goal ?? null,
      level: meta.level ?? null,
      subject: meta.subject ?? null,
      personalCourseId: meta.personalCourseId ?? null,
      embeddable: meta.embeddable ?? null,
      transcriptStatus: s.rawTranscript?.trim() ? 'ready' : s.status === 'PROCESSING' ? 'processing' : 'unavailable',
      transcriptSource: meta.transcriptSource ?? null,
      transcriptError: s.rawTranscript?.trim() ? null : s.processingError || null,
      segmentCount: segments.length,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }

  list(userId: string) {
    return withTable(FEATURE, async () => (await this.sessions.find({ where: { userId }, order: { updatedAt: 'DESC' }, take: 200 })).map((s) => this.view(s)));
  }

  get(userId: string, id: string) {
    return withTable(FEATURE, async () => {
      const s = await this.own(userId, id);
      return { ...this.view(s), segments: segmentsOf(s.rawTranscript), transcriptText: s.rawTranscript && !segmentsOf(s.rawTranscript).length ? s.rawTranscript : null };
    });
  }

  async create(userId: string, input: { url: string; title?: string; goal?: string; level?: string; subject?: string; personalCourseId?: string }) {
    const videoId = videoIdFrom(input.url ?? '');
    if (!videoId) throw new BadRequestException('Enter a YouTube video link, e.g. https://www.youtube.com/watch?v=…');
    return withTable(FEATURE, async () => {
      if (input.personalCourseId && !(await this.dataSource.getRepository(PersonalCourse).findOne({ where: { id: input.personalCourseId, userId } }))) {
        throw new NotFoundException('Course not found.');
      }
      const meta: SessionMeta = { goal: input.goal?.trim() || null, level: input.level?.trim() || null, subject: input.subject?.trim() || null, personalCourseId: input.personalCourseId ?? null, embeddable: null, transcriptSource: null };
      let title = input.title?.trim() || '';
      let channel: string | null = null;
      let thumb: string | null = null;
      if (this.network()) {
        // official oEmbed endpoint: title, channel, thumbnail; 401/403 = embedding disabled, 404 = private or missing
        try {
          const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(canonicalUrl(videoId))}`, { signal: AbortSignal.timeout(8000) });
          if (r.ok) {
            const j = (await r.json()) as { title?: string; author_name?: string; thumbnail_url?: string };
            title = title || j.title || '';
            channel = j.author_name ?? null;
            thumb = j.thumbnail_url ?? null;
            meta.embeddable = true;
          } else if (r.status === 401 || r.status === 403) meta.embeddable = false;
          else if (r.status === 404) throw new BadRequestException('This video is private, removed or does not exist.');
        } catch (err) {
          if (err instanceof BadRequestException) throw err;
          this.logger.warn(`oEmbed lookup failed for ${videoId}: ${(err as Error).message}`);
        }
      }
      const saved = await this.sessions.save(
        this.sessions.create({
          userId,
          videoUrl: canonicalUrl(videoId),
          videoId,
          title: (title || `YouTube video ${videoId}`).slice(0, 255),
          channelTitle: channel,
          thumbnailUrl: thumb,
          status: 'PROCESSING',
          structuredMaterial: { session: meta },
        } as Partial<YoutubeEntity>),
      );
      return this.view(await this.fetchTranscript(saved));
    });
  }

  /** Tries YouTube's captions once more (e.g. they were not ready before). */
  refetchTranscript(userId: string, id: string) {
    return withTable(FEATURE, async () => this.view(await this.fetchTranscript(await this.own(userId, id))));
  }

  private async fetchTranscript(s: YoutubeEntity): Promise<YoutubeEntity> {
    const meta = this.meta(s);
    if (!this.network()) {
      s.status = 'FAILED';
      s.processingError = 'Transcripts cannot be fetched on this server. Paste the transcript or your notes instead.';
      return this.sessions.save(s);
    }
    try {
      const items = await YoutubeTranscript.fetchTranscript(s.videoId);
      const lines = toTranscriptLines(items as { text: string; offset: number }[]);
      if (!lines) throw new Error('empty transcript');
      s.rawTranscript = lines;
      s.status = 'COMPLETED';
      s.processingError = '';
      s.structuredMaterial = { ...(s.structuredMaterial ?? {}), session: { ...meta, transcriptSource: 'youtube' } };
    } catch (err) {
      this.logger.warn(`transcript unavailable for ${s.videoId}: ${(err as Error).message}`);
      s.status = 'FAILED';
      s.processingError = 'No transcript is available for this video (captions may be off, or YouTube refused the request). Paste the transcript or your notes to use the AI with it.';
    }
    return this.sessions.save(s);
  }

  /** The learner supplies the transcript or notes (lines may start with [mm:ss] for timestamp links). */
  async setTranscript(userId: string, id: string, text: string) {
    const clean = (text ?? '').replace(/\r\n?/g, '\n').replace(/\u0000/g, '').trim();
    if (clean.length < 20) throw new BadRequestException('Paste at least a few sentences.');
    if (clean.length > MAX_TRANSCRIPT_CHARS) throw new BadRequestException('The transcript can be up to 200,000 characters.');
    return withTable(FEATURE, async () => {
      const s = await this.own(userId, id);
      s.rawTranscript = clean;
      s.status = 'COMPLETED';
      s.processingError = '';
      s.structuredMaterial = { ...(s.structuredMaterial ?? {}), session: { ...this.meta(s), transcriptSource: 'learner' } };
      return this.view(await this.sessions.save(s));
    });
  }

  listMessages(userId: string, id: string) {
    return withTable(FEATURE, async () => {
      await this.own(userId, id);
      return this.messages.find({ where: { sessionId: id, userId }, order: { createdAt: 'ASC' }, take: 500 });
    });
  }

  /** A question answered from the transcript only; timestamps not in the transcript are removed. */
  async ask(userId: string, id: string, question: string) {
    const q = (question ?? '').trim();
    if (!q) throw new BadRequestException('Ask a question.');
    if (q.length > 2000) throw new BadRequestException('Keep the question under 2,000 characters.');
    return withTable(FEATURE, async () => {
      const s = await this.own(userId, id);
      if (!s.rawTranscript?.trim()) throw new ConflictException('This video has no transcript yet. Paste the transcript or your notes first.');
      const previous = await this.messages.find({ where: { sessionId: id, userId }, order: { createdAt: 'DESC' }, take: HISTORY_TURNS });
      const history = previous.reverse().map((m) => ({ role: m.role, content: m.content }));
      let answer: string;
      try {
        const res = await getAiHttpClient().post('/api/v1/learn/ask', { question: q, source: { title: s.title ?? 'YouTube video', text: s.rawTranscript }, history });
        answer = typeof res.data?.answer === 'string' ? res.data.answer : '';
      } catch (err) {
        throw toAiHttpException(err, 'youtube ask');
      }
      if (!answer.trim()) throw new ConflictException('The AI returned an empty answer. Please try again.');
      const checked = verifyCitations(answer, transcriptStamps(s.rawTranscript));
      return this.dataSource.transaction(async (m) => {
        const repo = m.getRepository(YoutubeSessionMessage);
        const asked = await repo.save(repo.create({ sessionId: id, userId, role: 'user', content: q, citations: [] }));
        const answered = await repo.save(repo.create({ sessionId: id, userId, role: 'assistant', content: checked.text, citations: checked.citations }));
        await m.getRepository(YoutubeEntity).update({ id, userId }, { updatedAt: new Date() } as never);
        return { question: asked, answer: answered };
      });
    });
  }

  remove(userId: string, id: string) {
    return withTable(FEATURE, async () => {
      const s = await this.own(userId, id);
      await this.dataSource.transaction(async (m) => {
        await m.getRepository(YoutubeSessionMessage).delete({ sessionId: s.id, userId });
        await m.getRepository(YoutubeEntity).delete({ id: s.id, userId });
      });
      return { deleted: true };
    });
  }
}
