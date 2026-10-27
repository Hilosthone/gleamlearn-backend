import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { isMissingTable } from '../common/errors/missing-table.js';
import { likePattern } from '../search/search.service.js';

export type SearchResultType = 'course' | 'personal_course' | 'material' | 'resource' | 'assessment' | 'youtube' | 'note' | 'deck';

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string;
  /** The app route that opens the resource. */
  href: string;
  updatedAt: string | null;
}

const PER_TYPE = 6;

/**
 * One search box over everything the learner may see: the public catalogue, and the learner's OWN courses,
 * materials, generated lessons, quizzes / mock exams, YouTube sessions, notes and flashcard decks. Every
 * learner-owned query filters on "userId" = the signed-in learner. Parameterised ILIKE; a few results per type.
 */
@Injectable()
export class SearchEverythingService {
  private readonly logger = new Logger(SearchEverythingService.name);

  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async search(userId: string, rawQuery: string): Promise<{ query: string; results: SearchResult[]; unavailableTypes: SearchResultType[] }> {
    const query = (rawQuery ?? '').trim().slice(0, 100);
    if (query.length < 2) return { query, results: [], unavailableTypes: [] };
    const p = likePattern(query);
    const q = (sql: string, params: unknown[]) => this.ds.query(sql, params) as Promise<Record<string, any>[]>;

    const runs: [SearchResultType, () => Promise<SearchResult[]>][] = [
      ['course', async () => (await q(`SELECT id, title, track, level, "updatedAt" FROM courses WHERE title ILIKE $1 ESCAPE '\\' OR description ILIKE $1 ESCAPE '\\' ORDER BY title LIMIT ${PER_TYPE}`, [p])).map((r) => ({ type: 'course', id: r.id, title: r.title, subtitle: ['GleamLearn course', r.track, r.level].filter(Boolean).join(' · '), href: `/learn/${r.id}`, updatedAt: r.updatedAt })) as SearchResult[]],
      ['personal_course', async () => (await q(`SELECT id, title, "updatedAt" FROM personal_courses WHERE "userId" = $2 AND (title ILIKE $1 ESCAPE '\\' OR description ILIKE $1 ESCAPE '\\') ORDER BY "updatedAt" DESC LIMIT ${PER_TYPE}`, [p, userId])).map((r) => ({ type: 'personal_course', id: r.id, title: r.title, subtitle: 'My course', href: `/my-courses/${r.id}`, updatedAt: r.updatedAt })) as SearchResult[]],
      ['material', async () => (await q(`SELECT id, "originalName" AS title, "sourceType", "createdAt" FROM learner_materials WHERE "userId" = $2 AND ("originalName" ILIKE $1 ESCAPE '\\' OR "extractedText" ILIKE $1 ESCAPE '\\') ORDER BY "createdAt" DESC LIMIT ${PER_TYPE}`, [p, userId])).map((r) => ({ type: 'material', id: r.id, title: r.title, subtitle: r.sourceType === 'text' ? 'Pasted text' : 'Uploaded material', href: `/learn/materials/${r.id}`, updatedAt: r.createdAt })) as SearchResult[]],
      ['resource', async () => (await q(`SELECT id, title, kind, "updatedAt" FROM learning_resources WHERE "userId" = $2 AND kind NOT IN ('flashcards', 'course_plan') AND (title ILIKE $1 ESCAPE '\\' OR content ILIKE $1 ESCAPE '\\') ORDER BY "updatedAt" DESC LIMIT ${PER_TYPE}`, [p, userId])).map((r) => ({ type: 'resource', id: r.id, title: r.title, subtitle: String(r.kind).replace('_', ' '), href: `/learn/resources/${r.id}`, updatedAt: r.updatedAt })) as SearchResult[]],
      ['assessment', async () => (await q(`SELECT id, title, kind, "updatedAt" FROM learner_assessments WHERE "userId" = $2 AND title ILIKE $1 ESCAPE '\\' ORDER BY "updatedAt" DESC LIMIT ${PER_TYPE}`, [p, userId])).map((r) => ({ type: 'assessment', id: r.id, title: r.title, subtitle: r.kind === 'exam' ? 'Mock exam' : 'Quiz', href: `/practice/${r.id}`, updatedAt: r.updatedAt })) as SearchResult[]],
      ['youtube', async () => (await q(`SELECT id, title, "updatedAt" FROM youtube_resources WHERE "userId" = $2 AND (title ILIKE $1 ESCAPE '\\' OR "rawTranscript" ILIKE $1 ESCAPE '\\') ORDER BY "updatedAt" DESC LIMIT ${PER_TYPE}`, [p, userId])).map((r) => ({ type: 'youtube', id: r.id, title: r.title || 'YouTube session', subtitle: 'YouTube session', href: `/ai/youtube/${r.id}`, updatedAt: r.updatedAt })) as SearchResult[]],
      ['note', async () => (await q(`SELECT id, title, "updatedAt" FROM notes WHERE "userId" = $2 AND (title ILIKE $1 ESCAPE '\\' OR content ILIKE $1 ESCAPE '\\') ORDER BY "updatedAt" DESC LIMIT ${PER_TYPE}`, [p, userId])).map((r) => ({ type: 'note', id: r.id, title: r.title, subtitle: 'Note', href: '/library?tab=notes', updatedAt: r.updatedAt })) as SearchResult[]],
      ['deck', async () => (await q(`SELECT id, title, "updatedAt" FROM decks WHERE "userId" = $2 AND title ILIKE $1 ESCAPE '\\' ORDER BY "updatedAt" DESC LIMIT ${PER_TYPE}`, [p, userId])).map((r) => ({ type: 'deck', id: r.id, title: r.title, subtitle: 'Flashcard deck', href: '/library?tab=flashcards', updatedAt: r.updatedAt })) as SearchResult[]],
    ];

    const unavailableTypes: SearchResultType[] = [];
    const settled = await Promise.all(
      runs.map(async ([type, run]) => {
        try {
          return await run();
        } catch (err) {
          if (!isMissingTable(err)) this.logger.error(`search ${type} failed: ${(err as Error).message}`);
          unavailableTypes.push(type);
          return [];
        }
      }),
    );
    return { query, results: settled.flat(), unavailableTypes };
  }
}
