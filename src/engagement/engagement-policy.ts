/**
 * Engagement reward policy (pure; the service applies it inside a transaction).
 *
 * Daily visit: the first signed-in visit of a calendar day (app time zone) earns DAILY_VISIT_XP / _COINS, once.
 *
 * Active time: while GleamLearn is visible and the learner has interacted in the last ACTIVITY_WINDOW_SECONDS, the web
 * app sends a heartbeat every HEARTBEAT_SECONDS. The SERVER decides how much time to credit:
 *   - nothing for the first heartbeat of a session (it only starts the clock);
 *   - the time since the previous heartbeat, at most MAX_CREDIT_PER_BEAT_SECONDS, when that heartbeat arrived within
 *     MAX_GAP_SECONDS (a longer gap means the learner left; nothing is credited for it);
 *   - per learner, not per device: two open tabs or devices share one clock, so they cannot double the time.
 * Every ACTIVE_BLOCK_SECONDS credited earns ACTIVE_BLOCK_XP / _COINS, up to MAX_ACTIVE_BLOCKS_PER_DAY blocks a day
 * (60 minutes). Time keeps being counted after the cap, without rewards.
 */
export const DAILY_VISIT_XP = 5;
export const DAILY_VISIT_COINS = 5;

export const HEARTBEAT_SECONDS = 60;
export const ACTIVITY_WINDOW_SECONDS = 120;
export const MAX_CREDIT_PER_BEAT_SECONDS = 75;
export const MAX_GAP_SECONDS = 90;

export const ACTIVE_BLOCK_SECONDS = 600;
export const ACTIVE_BLOCK_XP = 2;
export const ACTIVE_BLOCK_COINS = 2;
export const MAX_ACTIVE_BLOCKS_PER_DAY = 6;

const DAY_SECONDS = 86_400;

/** Seconds of active time a heartbeat at `now` adds, given the previous heartbeat. */
export function creditFor(previous: Date | null, now: Date): number {
  if (!previous) return 0;
  const gap = (now.getTime() - previous.getTime()) / 1000;
  if (!(gap > 0) || gap > MAX_GAP_SECONDS) return 0;
  return Math.floor(Math.min(gap, MAX_CREDIT_PER_BEAT_SECONDS));
}

/** Reward blocks earned by `activeSeconds` of credited time today (capped). */
export function blocksFor(activeSeconds: number): number {
  return Math.min(MAX_ACTIVE_BLOCKS_PER_DAY, Math.floor(Math.max(0, activeSeconds) / ACTIVE_BLOCK_SECONDS));
}

export const clampDaySeconds = (s: number) => Math.min(DAY_SECONDS, Math.max(0, Math.floor(s)));

/** Seconds of active time until the next reward, or null when today's cap is reached. */
export function secondsToNextBlock(activeSeconds: number): number | null {
  if (blocksFor(activeSeconds) >= MAX_ACTIVE_BLOCKS_PER_DAY) return null;
  return ACTIVE_BLOCK_SECONDS - (Math.max(0, activeSeconds) % ACTIVE_BLOCK_SECONDS);
}

export const POLICY = {
  dailyVisit: { xp: DAILY_VISIT_XP, coins: DAILY_VISIT_COINS },
  activeTime: {
    blockMinutes: ACTIVE_BLOCK_SECONDS / 60,
    xp: ACTIVE_BLOCK_XP,
    coins: ACTIVE_BLOCK_COINS,
    maxBlocksPerDay: MAX_ACTIVE_BLOCKS_PER_DAY,
    heartbeatSeconds: HEARTBEAT_SECONDS,
    activityWindowSeconds: ACTIVITY_WINDOW_SECONDS,
  },
} as const;
