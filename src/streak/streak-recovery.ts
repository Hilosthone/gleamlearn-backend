/**
 * Streak recovery rules (pure functions; the service applies them inside a locked transaction).
 *
 *   - One recovery restores ONE missed calendar day. A gap of several days needs one recovery per day.
 *   - At most MONTHLY_RECOVERIES recoveries per calendar month (app time zone), counted from the recovery records.
 *   - A break can be recovered on the day the learner comes back (today counts, yesterday does not, and there is an
 *     earlier streak day). At midnight that chance ends and the streak simply continues from today.
 *   - A gap is offered only when it can be closed completely with the recoveries left this month; spending some of
 *     them on a gap that cannot be closed would waste them without restoring anything.
 *   - Recovered days count towards the streak (they are stored as streak days with source "streak_recovery") and are
 *     shown differently in the calendar.
 */
import { previousDay } from './streak-dates.js';

export const MONTHLY_RECOVERIES = 4;
export const RECOVERY_SOURCE = 'streak_recovery';

/** YYYY-MM-DD plus n days (UTC arithmetic on calendar dates; no time zone involved). */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const monthKey = (day: string) => day.slice(0, 7);

/** Length of the run of consecutive streak days ending at `end` (0 when `end` is not a streak day). */
export function runEndingAt(days: ReadonlySet<string>, end: string): number {
  let n = 0;
  for (let d = end; days.has(d); d = previousDay(d)) n++;
  return n;
}

export interface RecoveryState {
  /** missed days between the last streak day and today, oldest first ([] when nothing is broken) */
  missedDays: string[];
  /** the day the next recovery restores */
  nextMissedDay: string | null;
  /** recoveries left this calendar month */
  remainingThisMonth: number;
  monthlyAllowance: number;
  /** the gap can be closed now with the recoveries left */
  recoverable: boolean;
  /** why not, when there is a gap that cannot be recovered */
  reason: 'none' | 'allowance_exhausted' | 'gap_too_long' | null;
  /** the streak that ended before the gap (including any days already recovered) */
  brokenStreak: number;
  /** the streak once the whole gap is recovered (including today) */
  streakIfRecovered: number;
}

/**
 * @param days   every streak day of the learner (natural and recovered)
 * @param today  today in the app time zone
 * @param usedThisMonth recoveries already made this calendar month
 */
export function recoveryState(days: ReadonlySet<string>, today: string, usedThisMonth: number): RecoveryState {
  const remainingThisMonth = Math.max(0, MONTHLY_RECOVERIES - usedThisMonth);
  const none: RecoveryState = {
    missedDays: [],
    nextMissedDay: null,
    remainingThisMonth,
    monthlyAllowance: MONTHLY_RECOVERIES,
    recoverable: false,
    reason: null,
    brokenStreak: 0,
    streakIfRecovered: 0,
  };
  const yesterday = previousDay(today);
  // only on the day of return: today counts and yesterday is missing
  if (!days.has(today) || days.has(yesterday)) return none;
  const earlier = [...days].filter((d) => d < yesterday).sort();
  const last = earlier[earlier.length - 1];
  if (!last) return none; // a first-ever day: nothing to restore

  const missedDays: string[] = [];
  for (let d = addDays(last, 1); d < today; d = addDays(d, 1)) missedDays.push(d);
  const brokenStreak = runEndingAt(days, last);
  const fits = missedDays.length <= remainingThisMonth;
  return {
    missedDays,
    nextMissedDay: missedDays[0],
    remainingThisMonth,
    monthlyAllowance: MONTHLY_RECOVERIES,
    recoverable: fits,
    reason: fits ? 'none' : remainingThisMonth === 0 ? 'allowance_exhausted' : 'gap_too_long',
    brokenStreak,
    streakIfRecovered: brokenStreak + missedDays.length + 1,
  };
}

export type CalendarDayKind = 'active' | 'recovered' | 'missed' | 'today_pending';

/**
 * The calendar for one month, from the streak records: each past day is active (a natural streak day), recovered,
 * or missed (no streak day, on or after the learner's first streak day). Future days and days before the first
 * streak day are left out. Today without activity yet is "today_pending" rather than missed.
 */
export function calendarDays(
  natural: ReadonlySet<string>,
  recovered: ReadonlySet<string>,
  month: string,
  today: string,
): { date: string; kind: CalendarDayKind }[] {
  const all = [...natural, ...recovered].sort();
  const first = all[0];
  const out: { date: string; kind: CalendarDayKind }[] = [];
  if (!first) return out;
  for (let d = `${month}-01`; monthKey(d) === month && d <= today; d = addDays(d, 1)) {
    if (d < first) continue;
    if (natural.has(d)) out.push({ date: d, kind: 'active' });
    else if (recovered.has(d)) out.push({ date: d, kind: 'recovered' });
    else out.push({ date: d, kind: d === today ? 'today_pending' : 'missed' });
  }
  return out;
}
