import { buildSchedule, normaliseIntensity } from './plan-generator.js';

const today = new Date('2026-11-02T08:00:00Z'); // a Monday

describe('study plan generation (learner data only, deterministic)', () => {
  it('normal intensity: weekdays from tomorrow, topics in turn, every 4th session a quiz, final revision the day before', () => {
    const s = buildSchedule({ topics: ['Cells', 'Genes', 'Cells'], deadline: '2026-11-16', intensity: 'normal', examTarget: false, today, targetLabel: 'Biology' });
    expect(s[0]).toMatchObject({ scheduledDate: '2026-11-03', activityType: 'study', topic: 'Cells' });
    expect(s[3]).toMatchObject({ activityType: 'quiz_practice' });
    expect(s.filter((x) => x.activityType === 'study').map((x) => x.topic)).toEqual(['Cells', 'Genes', 'Cells', 'Genes', 'Cells', 'Genes', 'Cells']);
    expect(s.at(-1)).toMatchObject({ scheduledDate: '2026-11-15', activityType: 'revision' }); // a Sunday: kept for the final revision
    expect(s.some((x) => ['2026-11-07', '2026-11-08'].includes(x.scheduledDate) && x.activityType === 'study')).toBe(false); // weekend
    expect(s.every((x) => x.scheduledDate < '2026-11-16')).toBe(true);
  });

  it('exam targets get a mock exam with the final revision; intensity changes the days', () => {
    const exam = buildSchedule({ topics: ['Maths'], deadline: '2026-11-10', intensity: 'intensive', examTarget: true, today, targetLabel: 'JAMB' });
    expect(exam.slice(-2).map((x) => x.activityType)).toEqual(['exam_prep', 'revision']);
    expect(exam.filter((x) => x.activityType !== 'revision' && x.activityType !== 'exam_prep').length).toBe(6); // 3rd–8th
    const light = buildSchedule({ topics: ['Maths'], deadline: '2026-11-10', intensity: 'light', examTarget: false, today, targetLabel: 'X' });
    expect(light.map((x) => x.scheduledDate)).toEqual(['2026-11-04', '2026-11-07', '2026-11-09']);
  });

  it('no days before the deadline → nothing; unknown intensity → normal', () => {
    expect(buildSchedule({ topics: ['a'], deadline: '2026-11-03', intensity: 'normal', examTarget: false, today, targetLabel: 'X' })).toEqual([]);
    expect(normaliseIntensity('EXTREME')).toBe('normal');
    expect(normaliseIntensity('light')).toBe('light');
  });
});
