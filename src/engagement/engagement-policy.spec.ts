import { ACTIVE_BLOCK_SECONDS, MAX_ACTIVE_BLOCKS_PER_DAY, blocksFor, clampDaySeconds, creditFor, secondsToNextBlock } from './engagement-policy.js';

const at = (s: number) => new Date(Date.UTC(2026, 10, 2, 9, 0, 0) + s * 1000);

describe('engagement reward policy', () => {
  it('the first heartbeat of a session only starts the clock', () => {
    expect(creditFor(null, at(0))).toBe(0);
  });

  it('a regular heartbeat credits the time since the previous one', () => {
    expect(creditFor(at(0), at(60))).toBe(60);
  });

  it('a late heartbeat is capped; a long gap (the learner left) credits nothing', () => {
    expect(creditFor(at(0), at(80))).toBe(75);
    expect(creditFor(at(0), at(91))).toBe(0);
    expect(creditFor(at(0), at(3600))).toBe(0);
  });

  it('heartbeats in quick succession (several tabs) add up to wall-clock time, never more', () => {
    let last = at(0);
    let total = 0;
    for (const s of [1, 2, 3, 30, 31, 60]) {
      total += creditFor(last, at(s));
      last = at(s);
    }
    expect(total).toBe(60);
  });

  it('clock skew backwards credits nothing', () => {
    expect(creditFor(at(60), at(30))).toBe(0);
  });

  it('every 10 minutes is a block, capped at 6 a day (60 minutes)', () => {
    expect(blocksFor(599)).toBe(0);
    expect(blocksFor(600)).toBe(1);
    expect(blocksFor(ACTIVE_BLOCK_SECONDS * 6)).toBe(6);
    expect(blocksFor(ACTIVE_BLOCK_SECONDS * 50)).toBe(MAX_ACTIVE_BLOCKS_PER_DAY);
    expect(secondsToNextBlock(0)).toBe(600);
    expect(secondsToNextBlock(650)).toBe(550);
    expect(secondsToNextBlock(3600)).toBeNull();
  });

  it('a day never holds more than 24 hours of active time', () => {
    expect(clampDaySeconds(999_999)).toBe(86_400);
    expect(clampDaySeconds(-5)).toBe(0);
  });
});
