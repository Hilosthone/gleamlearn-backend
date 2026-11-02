import { MONTHLY_RECOVERIES, addDays, calendarDays, recoveryState, runEndingAt } from './streak-recovery.js';

const set = (...d: string[]) => new Set(d);
const range = (from: string, n: number) => Array.from({ length: n }, (_, i) => addDays(from, i));

describe('streak recovery rules', () => {
  it('date arithmetic crosses months and years', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('a run counts consecutive days ending at a day', () => {
    expect(runEndingAt(set(...range('2026-10-01', 5)), '2026-10-05')).toBe(5);
    expect(runEndingAt(set('2026-10-01', '2026-10-03'), '2026-10-03')).toBe(1);
    expect(runEndingAt(set('2026-10-01'), '2026-10-02')).toBe(0);
  });

  it('nothing to recover: alive streak, first-ever day, or today not counted yet', () => {
    expect(recoveryState(set('2026-11-01', '2026-11-02'), '2026-11-02', 0).missedDays).toEqual([]);
    expect(recoveryState(set('2026-11-02'), '2026-11-02', 0).missedDays).toEqual([]);
    expect(recoveryState(set('2026-10-29'), '2026-11-02', 0).missedDays).toEqual([]); // offered once today counts
  });

  it('one missed day: recoverable, restoring the old streak plus the recovered day and today', () => {
    const days = set(...range('2026-10-27', 5), '2026-11-02'); // 27..31 Oct, missed 1 Nov, back 2 Nov
    const s = recoveryState(days, '2026-11-02', 0);
    expect(s).toMatchObject({ missedDays: ['2026-11-01'], nextMissedDay: '2026-11-01', recoverable: true, remainingThisMonth: 4, brokenStreak: 5, streakIfRecovered: 7 });
  });

  it('several missed days need one recovery each; the oldest is recovered first', () => {
    const s = recoveryState(set('2026-11-01', '2026-11-05'), '2026-11-05', 0);
    expect(s.missedDays).toEqual(['2026-11-02', '2026-11-03', '2026-11-04']);
    expect(s.nextMissedDay).toBe('2026-11-02');
    expect(s.recoverable).toBe(true);
    // after recovering the first day, two remain and the streak behind the gap grew
    const after = recoveryState(set('2026-11-01', '2026-11-02', '2026-11-05'), '2026-11-05', 1);
    expect(after).toMatchObject({ missedDays: ['2026-11-03', '2026-11-04'], remainingThisMonth: 3, brokenStreak: 2 });
  });

  it('a gap that cannot be closed with the recoveries left is not offered (none would be wasted)', () => {
    expect(recoveryState(set('2026-11-01', '2026-11-04'), '2026-11-04', 3)).toMatchObject({ recoverable: false, reason: 'gap_too_long', remainingThisMonth: 1 });
    expect(recoveryState(set('2026-11-01', '2026-11-03'), '2026-11-03', MONTHLY_RECOVERIES)).toMatchObject({ recoverable: false, reason: 'allowance_exhausted', remainingThisMonth: 0 });
    expect(recoveryState(set('2026-11-01', '2026-11-08'), '2026-11-08', 0)).toMatchObject({ recoverable: false, reason: 'gap_too_long' }); // 6 days > 4
  });

  it('the allowance never goes negative', () => {
    expect(recoveryState(set('2026-11-01', '2026-11-03'), '2026-11-03', 9).remainingThisMonth).toBe(0);
  });

  it('the calendar marks active, recovered, missed and today; nothing before the first day or in the future', () => {
    const natural = set('2026-11-01', '2026-11-02', '2026-11-05');
    const recovered = set('2026-11-03');
    expect(calendarDays(natural, recovered, '2026-11', '2026-11-06')).toEqual([
      { date: '2026-11-01', kind: 'active' },
      { date: '2026-11-02', kind: 'active' },
      { date: '2026-11-03', kind: 'recovered' },
      { date: '2026-11-04', kind: 'missed' },
      { date: '2026-11-05', kind: 'active' },
      { date: '2026-11-06', kind: 'today_pending' },
    ]);
    expect(calendarDays(set('2026-11-10'), set(), '2026-11', '2026-11-11').map((d) => d.date)).toEqual(['2026-11-10', '2026-11-11']);
    expect(calendarDays(set(), set(), '2026-11', '2026-11-11')).toEqual([]);
  });
});
