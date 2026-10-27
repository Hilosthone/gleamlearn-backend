import type { AttemptReview, LearnerAssessment, QuestionReview, StoredQuestion } from './entities.js';

/** Topics at or above this share of correct answers are strengths; below are to revise. */
export const STRENGTH_THRESHOLD = 70;

/** The learner's view of an assessment: no answers or explanations (those come only in a review). */
export function learnerView(a: LearnerAssessment) {
  return {
    id: a.id,
    kind: a.kind,
    title: a.title,
    examType: a.examType,
    difficulty: a.difficulty,
    durationMinutes: a.durationMinutes,
    feedbackMode: a.feedbackMode,
    sourceType: a.sourceType,
    materialId: a.materialId,
    personalCourseId: a.personalCourseId,
    moduleId: a.moduleId,
    resourceId: a.resourceId,
    youtubeSessionId: a.youtubeSessionId,
    requestedCount: a.requestedCount,
    questionCount: a.questions.length,
    truncated: a.truncated,
    createdAt: a.createdAt,
    /** Shown with every learner-generated assessment. */
    notice: 'AI-generated practice questions from your material — not official past questions.',
    questions: a.questions.map((q, index) => ({ index, question: q.question, options: q.options, topic: q.topic || null })),
  };
}

/** Keeps only answers to real questions that are one of that question's options. */
export function sanitiseAnswers(questions: StoredQuestion[], raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const i = Number(k);
    if (!Number.isInteger(i) || i < 0 || i >= questions.length) continue;
    if (typeof v === 'string' && questions[i].options.includes(v)) out[String(i)] = v;
  }
  return out;
}

export function grade(questions: StoredQuestion[], answers: Record<string, string>): { score: number; correctCount: number; review: AttemptReview } {
  const reviewQuestions: QuestionReview[] = questions.map((q, index) => {
    const chosen = answers[String(index)] ?? null;
    return { index, question: q.question, options: q.options, chosen, answer: q.answer, correct: chosen === q.answer, explanation: q.explanation, topic: q.topic || 'General' };
  });
  const correctCount = reviewQuestions.filter((q) => q.correct).length;
  const byTopic = new Map<string, { correct: number; total: number }>();
  for (const q of reviewQuestions) {
    const t = byTopic.get(q.topic) ?? { correct: 0, total: 0 };
    t.total += 1;
    if (q.correct) t.correct += 1;
    byTopic.set(q.topic, t);
  }
  const topics = Array.from(byTopic, ([topic, t]) => ({ topic, ...t, percent: Math.round((t.correct / t.total) * 100) }));
  return {
    score: questions.length ? Math.round((correctCount / questions.length) * 100) : 0,
    correctCount,
    review: {
      questions: reviewQuestions,
      topics,
      strengths: topics.filter((t) => t.percent >= STRENGTH_THRESHOLD).map((t) => t.topic),
      toRevise: topics.filter((t) => t.percent < STRENGTH_THRESHOLD).map((t) => t.topic),
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Transcript timestamps
// ---------------------------------------------------------------------------------------------------------------

export function formatTimestamp(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${String(m).padStart(2, '0')}:${sec}`;
}

export function parseTimestamp(stamp: string): number | null {
  const parts = stamp.split(':').map((p) => Number(p));
  if (parts.some((n) => !Number.isInteger(n) || n < 0)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

/** Seconds of every "[mm:ss] text" line of a stored transcript. */
export function transcriptStamps(transcript: string | null | undefined): Set<number> {
  const out = new Set<number>();
  for (const m of (transcript ?? '').matchAll(/^\[(\d{1,2}:\d{2}(?::\d{2})?)\]/gm)) {
    const s = parseTimestamp(m[1]);
    if (s !== null) out.add(s);
  }
  return out;
}

/**
 * Keeps only timestamps that exist in the transcript. Any other "[mm:ss]" the model wrote is removed from the
 * answer (never shown as a link), so learners only get timestamps that really are in the video's transcript.
 */
export function verifyCitations(answer: string, stamps: Set<number>): { text: string; citations: number[] } {
  const citations: number[] = [];
  const text = answer
    .replace(/\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g, (whole, stamp: string) => {
      const s = parseTimestamp(stamp);
      if (s !== null && stamps.has(s)) {
        if (!citations.includes(s)) citations.push(s);
        return `[${formatTimestamp(s)}]`;
      }
      return '';
    })
    .replace(/ +([.,;:!?])/g, '$1')
    .replace(/ {2,}/g, ' ')
    .trim();
  return { text, citations };
}
