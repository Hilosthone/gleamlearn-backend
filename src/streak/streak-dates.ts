/**
 * Calendar days for streaks.
 *
 * A streak counts calendar days in ONE application time zone, so every learner, the server and the web app agree on
 * when "today" starts. GleamLearn's learners are in Nigeria, so the default is Africa/Lagos (UTC+1, no daylight
 * saving). STREAK_TIME_ZONE overrides it; an invalid value falls back to the default.
 * Previously the server's UTC date was used, so activity between 00:00 and 01:00 in Lagos counted for the day before.
 */

export const DEFAULT_STREAK_TIME_ZONE = 'Africa/Lagos';

export function streakTimeZone(): string {
  const tz = process.env.STREAK_TIME_ZONE?.trim();
  if (!tz) return DEFAULT_STREAK_TIME_ZONE;
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_STREAK_TIME_ZONE;
  }
}

/** The calendar date (YYYY-MM-DD) of `at` in `timeZone`. */
export function dayInZone(at: Date, timeZone = streakTimeZone()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** The calendar day before `ymd` (pure date arithmetic; no time zone involved). */
export function previousDay(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Postgres `date` columns may come back as a string or a Date; normalise to YYYY-MM-DD (or null). */
export function asDay(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  const s = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

/**
 * The streak after qualifying activity on `today`, given the stored streak and last active day.
 * - same day again        → unchanged (counted: false)
 * - the next day          → +1
 * - first activity or a gap of a whole day or more → 1
 */
export function nextStreak(stored: number, lastDay: string | null, today: string): { current: number; counted: boolean } {
  if (lastDay === today) return { current: stored, counted: false };
  if (lastDay && lastDay === previousDay(today)) return { current: stored + 1, counted: true };
  return { current: 1, counted: true };
}

/** The streak to show today: still alive if the last active day is today or yesterday, otherwise 0 (broken). */
export function activeStreak(stored: number, lastDay: string | null, today: string): number {
  return lastDay === today || (lastDay !== null && lastDay === previousDay(today)) ? stored : 0;
}
