/**
 * Builds a study schedule from the learner's own data — no AI, nothing invented:
 *   topics  = the target's open topics (unfinished course modules / exam subjects), then the learner's weak topics;
 *   days    = from tomorrow until the day before the deadline, on the intensity's weekdays;
 *   pattern = study sessions in turn, every 4th a quiz-practice session on what was just studied, and the day before
 *             the deadline a final revision (plus a mock exam for an exam target).
 */
export type Intensity = 'light' | 'normal' | 'intensive';
/** Study weekdays per intensity (0 = Sunday). */
const DAYS: Record<Intensity, number[]> = { light: [1, 3, 6], normal: [1, 2, 3, 4, 5], intensive: [0, 1, 2, 3, 4, 5, 6] };
export const MAX_SESSIONS = 120;

export interface PlannedSession {
  title: string;
  description: string;
  scheduledDate: string; // YYYY-MM-DD
  activityType: 'study' | 'quiz_practice' | 'revision' | 'exam_prep';
  topic: string | null;
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);

export function normaliseIntensity(v: unknown): Intensity {
  const s = String(v ?? '').toLowerCase();
  return s === 'light' || s === 'intensive' ? s : 'normal';
}

export function buildSchedule(opts: { topics: string[]; deadline: string; intensity: Intensity; examTarget: boolean; today?: Date; targetLabel: string }): PlannedSession[] {
  const today = opts.today ?? new Date();
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1));
  const end = new Date(`${opts.deadline}T00:00:00.000Z`); // the deadline day itself is not scheduled
  const topics = [...new Set(opts.topics.map((t) => t.trim()).filter(Boolean))];
  const days: Date[] = [];
  for (const d = new Date(start); d < end && days.length < MAX_SESSIONS; d.setUTCDate(d.getUTCDate() + 1)) {
    if (DAYS[opts.intensity].includes(d.getUTCDay())) days.push(new Date(d));
  }
  // the last available day before the deadline is always kept for the final revision, even off-pattern
  const lastDay = new Date(end.getTime() - 86_400_000);
  if (lastDay >= start && (!days.length || ymd(days[days.length - 1]) !== ymd(lastDay))) days.push(lastDay);
  if (!days.length) return [];

  const out: PlannedSession[] = [];
  const studyDays = days.slice(0, -1);
  let t = 0;
  const recent: string[] = [];
  studyDays.forEach((d, i) => {
    if ((i + 1) % 4 === 0 && recent.length) {
      out.push({ title: `Practice quiz: ${recent.slice(-3).join(', ')}`, description: 'Test yourself on what you studied this week, then review your mistakes.', scheduledDate: ymd(d), activityType: 'quiz_practice', topic: null });
      return;
    }
    const topic = topics.length ? topics[t++ % topics.length] : null;
    if (topic) recent.push(topic);
    out.push({ title: topic ? `Study: ${topic}` : `Study: ${opts.targetLabel}`, description: topic ? `Learn and make notes on ${topic}.` : 'Work through your material.', scheduledDate: ymd(d), activityType: 'study', topic });
  });
  const final = ymd(days[days.length - 1]);
  if (opts.examTarget) out.push({ title: `Mock exam: ${opts.targetLabel}`, description: 'Take a timed mock exam under exam conditions.', scheduledDate: final, activityType: 'exam_prep', topic: null });
  out.push({ title: `Final revision: ${opts.targetLabel}`, description: topics.length ? `Revise: ${topics.slice(0, 8).join(', ')}.` : 'Revise your notes and mistakes.', scheduledDate: final, activityType: 'revision', topic: null });
  return out;
}
