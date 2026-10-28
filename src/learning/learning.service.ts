import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { getAiHttpClient } from '../common/ai-service/ai-http.client.js';
import { toAiHttpException } from '../common/ai-service/ai-error.js';
import { withTable } from '../common/errors/missing-table.js';
import { LearnerMaterial, PersonalCourse, PersonalCourseModule } from '../learner-content/entities.js';
import { NoteEntity } from '../notes/entities/note.entity.js';
import { YoutubeEntity } from '../youtube/entities/youtube.entity.js';
import { Deck } from '../flashcards/entities/deck.entity.js';
import { Flashcard } from '../flashcards/entities/flashcard.entity.js';
import { LearnerAssessment, LearningResource, TEXT_RESOURCE_KINDS, type SourceType, type StoredQuestion } from './entities.js';
import { validateVisualLesson, visualLessonText } from './visual-lesson.js';

export const GENERATE_KINDS = [...TEXT_RESOURCE_KINDS, 'quiz', 'exam', 'flashcards', 'course_plan', 'visual_lesson'] as const;
export type GenerateKind = (typeof GENERATE_KINDS)[number];

export interface GenerateOptions {
  count?: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  level?: string;
  examGoal?: string;
  objective?: string;
  subject?: string;
  focus?: string;
  durationMinutes?: number;
  feedbackMode?: 'after_submit' | 'immediate';
}

export interface GenerateInput {
  requestId: string;
  kind: GenerateKind;
  sourceType: SourceType;
  sourceId?: string;
  text?: string;
  title?: string;
  personalCourseId?: string;
  moduleId?: string;
  options?: GenerateOptions;
}

/** What a generation produced, as a link the app can open. */
export interface GenerateResult {
  type: 'resource' | 'assessment' | 'deck' | 'course';
  id: string;
  resourceId: string | null;
  kind: GenerateKind;
  title: string;
  reused: boolean;
}

interface Source {
  title: string;
  text: string;
  materialId: string | null;
  personalCourseId: string | null;
  moduleId: string | null;
  youtubeSessionId: string | null;
}

const FEATURE = 'Learning from your material';
const MAX_SOURCE_CHARS = 200_000;
const KIND_LABEL: Record<GenerateKind, string> = {
  visual_lesson: 'Visual lesson',
  lesson: 'Lesson',
  summary: 'Summary',
  notes: 'Notes',
  study_plan: 'Study plan',
  key_concepts: 'Key concepts',
  explanation: 'Explanation',
  quiz: 'Quiz',
  exam: 'Mock exam',
  flashcards: 'Flashcards',
  course_plan: 'Course plan',
};

@Injectable()
export class LearningService {
  private readonly logger = new Logger(LearningService.name);
  /** Same learner + requestId while the first is still running: wait for it instead of a second AI call. */
  private readonly inflight = new Map<string, Promise<GenerateResult>>();

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(LearningResource) private readonly resources: Repository<LearningResource>,
    @InjectRepository(LearnerAssessment) private readonly assessments: Repository<LearnerAssessment>,
  ) {}

  // -------------------------------------------------------------------------------------------------------------
  // Sources — always the learner's own records
  // -------------------------------------------------------------------------------------------------------------

  async resolveSource(userId: string, input: Pick<GenerateInput, 'sourceType' | 'sourceId' | 'text' | 'title' | 'personalCourseId' | 'moduleId'>): Promise<Source> {
    const ds = this.dataSource;
    const base = { materialId: null, personalCourseId: input.personalCourseId ?? null, moduleId: input.moduleId ?? null, youtubeSessionId: null };
    const need = () => {
      if (!input.sourceId) throw new BadRequestException('Choose what to learn from.');
      return input.sourceId;
    };
    switch (input.sourceType) {
      case 'topic': {
        // a short topic, taught from general knowledge (only for visual lessons, which say so to the learner)
        const topic = (input.text ?? '').replace(/s+/g, ' ').trim();
        if (topic.length < 3 || topic.length > 300) throw new BadRequestException('Name a topic in 3 to 300 characters.');
        return { ...base, title: input.title?.trim() || topic.slice(0, 120), text: `Topic: ${topic}` };
      }
      case 'text': {
        const text = (input.text ?? '').trim();
        if (text.length < 20) throw new BadRequestException('Add at least a few sentences of text to learn from.');
        return { ...base, title: input.title?.trim() || 'Your text', text: text.slice(0, MAX_SOURCE_CHARS) };
      }
      case 'material': {
        const m = await ds.getRepository(LearnerMaterial).findOne({
          where: { id: need(), userId },
          select: { id: true, originalName: true, status: true, extractedText: true, personalCourseId: true },
        });
        if (!m) throw new NotFoundException('Material not found.');
        if (m.status !== 'READY' || !m.extractedText) throw new ConflictException('This material has no readable text yet. Wait for processing to finish, or try again if it failed.');
        return { ...base, title: m.originalName, text: m.extractedText, materialId: m.id, personalCourseId: input.personalCourseId ?? m.personalCourseId };
      }
      case 'course': {
        const course = await ds.getRepository(PersonalCourse).findOne({ where: { id: need(), userId } });
        if (!course) throw new NotFoundException('Course not found.');
        const modules = await ds.getRepository(PersonalCourseModule).find({ where: { courseId: course.id, userId }, order: { position: 'ASC' } });
        const mats = await ds.getRepository(LearnerMaterial).find({
          where: { personalCourseId: course.id, userId, status: 'READY' },
          select: { id: true, originalName: true, extractedText: true },
        });
        const text = [
          `Course: ${course.title}`,
          course.description ? `Description: ${course.description}` : '',
          course.subjects.length ? `Subjects: ${course.subjects.join(', ')}` : '',
          course.objectives?.length ? `Objectives:\n- ${course.objectives.join('\n- ')}` : '',
          modules.length ? `Modules:\n${modules.map((m, i) => `${i + 1}. ${m.title}${m.notes ? `\n${m.notes}` : ''}`).join('\n')}` : '',
          ...mats.map((m) => `Material: ${m.originalName}\n${m.extractedText ?? ''}`),
        ]
          .filter(Boolean)
          .join('\n\n');
        return { ...base, title: course.title, text: text.slice(0, MAX_SOURCE_CHARS), personalCourseId: course.id };
      }
      case 'module': {
        const mod = await ds.getRepository(PersonalCourseModule).findOne({ where: { id: need(), userId } });
        if (!mod) throw new NotFoundException('Module not found.');
        const course = await ds.getRepository(PersonalCourse).findOne({ where: { id: mod.courseId, userId } });
        const text = [course ? `Course: ${course.title}` : '', `Module: ${mod.title}`, mod.notes ?? ''].filter(Boolean).join('\n\n');
        return { ...base, title: mod.title, text, personalCourseId: mod.courseId, moduleId: mod.id };
      }
      case 'resource': {
        const r = await this.resources.findOne({ where: { id: need(), userId } });
        if (!r) throw new NotFoundException('Lesson not found.');
        // a visual lesson is stored as JSON: learn from its words, not its structure
        const text = r.kind === 'visual_lesson' ? visualLessonText(r.content) : r.content;
        return { ...base, title: r.title, text, materialId: r.materialId, personalCourseId: r.personalCourseId, moduleId: r.moduleId, youtubeSessionId: r.youtubeSessionId };
      }
      case 'note': {
        const n = await ds.getRepository(NoteEntity).findOne({ where: { id: need(), userId } });
        if (!n) throw new NotFoundException('Note not found.');
        return { ...base, title: n.title, text: n.content };
      }
      case 'youtube': {
        const y = await ds.getRepository(YoutubeEntity).findOne({ where: { id: need(), userId } });
        if (!y) throw new NotFoundException('YouTube session not found.');
        if (!y.rawTranscript?.trim()) throw new ConflictException('This video has no transcript yet. Paste the transcript or your notes in the session first.');
        const course = (y.structuredMaterial as { session?: { personalCourseId?: string } } | null)?.session?.personalCourseId ?? null;
        return { ...base, title: y.title || 'YouTube lesson', text: y.rawTranscript, youtubeSessionId: y.id, personalCourseId: input.personalCourseId ?? course };
      }
      default:
        throw new BadRequestException('Unknown source.');
    }
  }

  // -------------------------------------------------------------------------------------------------------------
  // Generation
  // -------------------------------------------------------------------------------------------------------------

  async generate(userId: string, input: GenerateInput): Promise<GenerateResult> {
    const key = `${userId}:${input.requestId}`;
    const running = this.inflight.get(key);
    if (running) return running;
    const job = withTable(FEATURE, () => this.runGenerate(userId, input)).finally(() => this.inflight.delete(key));
    this.inflight.set(key, job);
    return job;
  }

  private async existing(userId: string, requestId: string, kind: GenerateKind): Promise<GenerateResult | null> {
    const a = await this.assessments.findOne({ where: { userId, requestId } });
    if (a) return { type: 'assessment', id: a.id, resourceId: null, kind, title: a.title, reused: true };
    const r = await this.resources.findOne({ where: { userId, requestId } });
    if (!r) return null;
    if (r.kind === 'flashcards') return { type: 'deck', id: String(r.options.deckId), resourceId: r.id, kind, title: r.title, reused: true };
    if (r.kind === 'course_plan') return { type: 'course', id: String(r.personalCourseId), resourceId: r.id, kind, title: r.title, reused: true };
    return { type: 'resource', id: r.id, resourceId: r.id, kind, title: r.title, reused: true };
  }

  private async runGenerate(userId: string, input: GenerateInput): Promise<GenerateResult> {
    const already = await this.existing(userId, input.requestId, input.kind);
    if (already) return already; // a retry or second click: same result, no second AI call

    if (input.personalCourseId && !(await this.dataSource.getRepository(PersonalCourse).findOne({ where: { id: input.personalCourseId, userId } }))) {
      throw new NotFoundException('Course not found.');
    }
    if (input.sourceType === 'topic' && input.kind !== 'visual_lesson') {
      throw new BadRequestException('A topic on its own can only make a visual lesson; add material for other kinds.');
    }
    if (input.kind === 'course_plan' && !(input.personalCourseId || input.sourceType === 'course')) {
      throw new BadRequestException('Choose the course to plan.');
    }
    const src = await this.resolveSource(userId, input);
    const options = input.options ?? {};
    const title = (input.title?.trim() || `${KIND_LABEL[input.kind]}: ${src.title}`).slice(0, 255);

    let out: Record<string, any>;
    try {
      const res = await getAiHttpClient().post('/api/v1/learn/generate', {
        kind: input.kind,
        text: src.text,
        title: src.title.slice(0, 200),
        ...(input.sourceType === 'topic' ? { sourceMode: 'topic' } : {}),
        options: { count: options.count, difficulty: options.difficulty, level: options.level, examGoal: options.examGoal, objective: options.objective, subject: options.subject, focus: options.focus },
      });
      out = res.data ?? {};
    } catch (err) {
      throw toAiHttpException(err, `learning generate ${input.kind}`);
    }
    const links = { materialId: src.materialId, personalCourseId: src.personalCourseId, moduleId: src.moduleId, youtubeSessionId: src.youtubeSessionId };
    const truncated = out.truncated === true;

    try {
      if ((TEXT_RESOURCE_KINDS as readonly string[]).includes(input.kind)) {
        const content = typeof out.content === 'string' ? out.content.trim() : '';
        if (!content) throw new BadRequestException('The AI returned an empty answer. Please try again.');
        const r = await this.resources.save(
          this.resources.create({ userId, requestId: input.requestId, kind: input.kind as LearningResource['kind'], title, content, sourceType: input.sourceType, ...links, options: options as never, truncated }),
        );
        return { type: 'resource', id: r.id, resourceId: r.id, kind: input.kind, title: r.title, reused: false };
      }

      if (input.kind === 'visual_lesson') {
        const lesson = validateVisualLesson(out.lesson);
        if (!lesson) throw new BadRequestException('The AI did not return a usable visual lesson. Please try again.');
        const r = await this.resources.save(
          this.resources.create({ userId, requestId: input.requestId, kind: 'visual_lesson', title, content: JSON.stringify({ ...lesson, basis: input.sourceType === 'topic' ? 'topic' : 'material' }), sourceType: input.sourceType, ...links, options: options as never, truncated }),
        );
        return { type: 'resource', id: r.id, resourceId: r.id, kind: input.kind, title: r.title, reused: false };
      }

      if (input.kind === 'quiz' || input.kind === 'exam') {
        const questions = (Array.isArray(out.questions) ? out.questions : []) as StoredQuestion[];
        if (!questions.length) throw new BadRequestException('The AI returned no usable questions. Please try again.');
        const resourceId = input.sourceType === 'resource' ? (input.sourceId ?? null) : null;
        const a = await this.assessments.save(
          this.assessments.create({
            userId,
            requestId: input.requestId,
            kind: input.kind,
            title,
            examType: options.examGoal?.trim().slice(0, 60) || null,
            difficulty: options.difficulty ?? null,
            durationMinutes: options.durationMinutes && options.durationMinutes > 0 ? Math.min(Math.round(options.durationMinutes), 300) : null,
            feedbackMode: options.feedbackMode === 'immediate' && input.kind === 'quiz' ? 'immediate' : 'after_submit',
            questions,
            sourceType: input.sourceType,
            ...links,
            resourceId,
            requestedCount: Number(out.requested) || questions.length,
            truncated,
          }),
        );
        return { type: 'assessment', id: a.id, resourceId: null, kind: input.kind, title: a.title, reused: false };
      }

      if (input.kind === 'flashcards') {
        const cards = (Array.isArray(out.cards) ? out.cards : []) as { question: string; answer: string }[];
        if (!cards.length) throw new BadRequestException('The AI returned no usable flashcards. Please try again.');
        return await this.dataSource.transaction(async (m) => {
          const deck = await m.getRepository(Deck).save(m.getRepository(Deck).create({ userId, title: title.slice(0, 255), description: `Generated from ${src.title}`, category: options.subject ?? '' }));
          await m.getRepository(Flashcard).save(cards.map((c) => m.getRepository(Flashcard).create({ deckId: deck.id, question: c.question, answer: c.answer })));
          const r = await m.getRepository(LearningResource).save(
            m.getRepository(LearningResource).create({
              userId,
              requestId: input.requestId,
              kind: 'flashcards',
              title,
              content: `${cards.length} flashcards`,
              sourceType: input.sourceType,
              ...links,
              options: { ...options, deckId: deck.id } as never,
              truncated,
            }),
          );
          return { type: 'deck' as const, id: deck.id, resourceId: r.id, kind: input.kind, title, reused: false };
        });
      }

      // course_plan: modules added to the learner's own course, all or nothing
      const courseId = input.personalCourseId ?? src.personalCourseId;
      const modules = (Array.isArray(out.modules) ? out.modules : []) as { title: string; objective: string }[];
      if (!courseId || !modules.length) throw new BadRequestException('The AI returned no usable course plan. Please try again.');
      return await this.dataSource.transaction(async (m) => {
        const repo = m.getRepository(PersonalCourseModule);
        const start = await repo.count({ where: { courseId, userId } });
        await repo.save(modules.map((mod, i) => repo.create({ courseId, userId, title: mod.title.slice(0, 200), notes: mod.objective || null, position: start + i })));
        const r = await m.getRepository(LearningResource).save(
          m.getRepository(LearningResource).create({
            userId,
            requestId: input.requestId,
            kind: 'course_plan',
            title,
            content: modules.map((mod, i) => `${i + 1}. ${mod.title}${mod.objective ? ` — ${mod.objective}` : ''}`).join('\n'),
            sourceType: input.sourceType,
            ...links,
            personalCourseId: courseId,
            options: options as never,
            truncated,
          }),
        );
        return { type: 'course' as const, id: courseId, resourceId: r.id, kind: input.kind, title, reused: false };
      });
    } catch (err) {
      // two identical requests raced past the check: the unique (userId, requestId) index kept one; return it
      if ((err as { driverError?: { code?: string } })?.driverError?.code === '23505') {
        const again = await this.existing(userId, input.requestId, input.kind);
        if (again) return again;
      }
      throw err;
    }
  }

  // -------------------------------------------------------------------------------------------------------------
  // Resources
  // -------------------------------------------------------------------------------------------------------------

  listResources(userId: string, filter: { personalCourseId?: string; kind?: string; materialId?: string; youtubeSessionId?: string }) {
    return withTable(FEATURE, () =>
      this.resources.find({
        where: {
          userId,
          ...(filter.personalCourseId ? { personalCourseId: filter.personalCourseId } : {}),
          ...(filter.kind ? { kind: filter.kind as never } : {}),
          ...(filter.materialId ? { materialId: filter.materialId } : {}),
          ...(filter.youtubeSessionId ? { youtubeSessionId: filter.youtubeSessionId } : {}),
        },
        order: { createdAt: 'DESC' },
        take: 200,
      }),
    );
  }

  getResource(userId: string, id: string) {
    return withTable(FEATURE, async () => {
      const r = await this.resources.findOne({ where: { id, userId } });
      if (!r) throw new NotFoundException('Not found.');
      return r;
    });
  }

  updateResource(userId: string, id: string, patch: { title?: string; completed?: boolean }) {
    return withTable(FEATURE, async () => {
      const r = await this.resources.findOne({ where: { id, userId } });
      if (!r) throw new NotFoundException('Not found.');
      if (patch.title !== undefined) r.title = patch.title.trim().slice(0, 255) || r.title;
      if (patch.completed !== undefined) r.completedAt = patch.completed ? (r.completedAt ?? new Date()) : null;
      return this.resources.save(r);
    });
  }

  deleteResource(userId: string, id: string) {
    return withTable(FEATURE, async () => {
      const res = await this.resources.delete({ id, userId });
      if (!res.affected) throw new NotFoundException('Not found.');
      return { deleted: true };
    });
  }
}
