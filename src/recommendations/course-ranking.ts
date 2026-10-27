/**
 * Ranks catalogue courses for a learner using profile fields that exist (education type, class/level, exam goals,
 * course of study / department / faculty) and the catalogue's own fields (track, level, title, description,
 * department). Plain matching, no AI: every reason names the profile value it came from, so none is invented.
 */

export interface LearnerProfile {
  educationType?: string | null;
  secondaryClass?: string | null;
  level?: string | null;
  examAimOrGoals?: string | null;
  courseOfStudy?: string | null;
  department?: string | null;
  faculty?: string | null;
}

export interface CatalogueCourse {
  id: string;
  title: string;
  description: string | null;
  track: string | null;
  level: string | null;
  departmentName: string | null;
}

export interface Recommendation {
  course: CatalogueCourse;
  score: number;
  reasons: string[];
}

export interface RankingResult {
  recommendations: Recommendation[];
  /** Profile details that were used, and missing ones that would improve recommendations. */
  usedProfile: string[];
  missingProfile: string[];
  /** Exam goals from the profile that no catalogue course covers yet (shown so the gap is visible). */
  uncoveredExamGoals: string[];
  catalogueSize: number;
}

const EXAMS: [string, RegExp][] = [
  ['Post-UTME', /\bpost[\s-]?utme\b/i],
  ['JAMB', /\bjamb\b|(?<!post[\s-]?)\butme\b/i],
  ['WAEC', /\bwaec\b|\bwassce\b/i],
  ['NECO', /\bneco\b/i],
  ['GCE', /\bgce\b/i],
  ['BECE', /\bbece\b/i],
  ['IGCSE', /\bigcse\b/i],
  ['SAT', /\bsat\b/],
];

export function examsIn(text: string | null | undefined): string[] {
  if (!text) return [];
  return EXAMS.filter(([, re]) => re.test(text)).map(([name]) => name);
}

/** "SS 2", "SSS2", "ss2" → "ss2"; "JSS 1" → "jss1"; "300 Level", "300L" → "300l". Unknown formats → lower-cased compact text. */
export function normaliseLevel(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.toLowerCase().replace(/[\s._-]+/g, '');
  let m = s.match(/^s{2,3}([1-3])$/);
  if (m) return `ss${m[1]}`;
  m = s.match(/^j{1}s{2,3}([1-3])$/);
  if (m) return `jss${m[1]}`;
  m = s.match(/^([1-7]00)(l|level|lvl)?$/);
  if (m) return `${m[1]}l`;
  return s || null;
}

const STOP = new Set(['and', 'the', 'of', 'for', 'with', 'in', 'to', 'studies', 'study', 'faculty', 'department', 'school', 'science', 'sciences', 'engineering', 'education', 'general', 'level', 'course', 'introduction', 'intro']);
const words = (s: string | null | undefined) =>
  (s ?? '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !STOP.has(w));

function trackOf(educationType: string | null | undefined): 'Secondary' | 'University' | null {
  const t = (educationType ?? '').toLowerCase();
  if (t.startsWith('second')) return 'Secondary';
  if (t.startsWith('univ') || t.includes('tertiary')) return 'University';
  return null;
}

export function rankCourses(profile: LearnerProfile, catalogue: CatalogueCourse[], enrolledIds: Set<string>, limit = 12): RankingResult {
  const track = trackOf(profile.educationType);
  const classLabel = (track === 'Secondary' ? profile.secondaryClass || profile.level : profile.level || profile.secondaryClass) ?? null;
  const learnerLevel = normaliseLevel(classLabel);
  const goals = examsIn(profile.examAimOrGoals);
  const studyFields = [
    ['course of study', profile.courseOfStudy],
    ['department', profile.department],
    ['faculty', profile.faculty],
  ] as const;

  const usedProfile: string[] = [];
  const missingProfile: string[] = [];
  (track ? usedProfile : missingProfile).push('education type');
  (learnerLevel ? usedProfile : missingProfile).push(track === 'University' ? 'level' : 'class');
  (goals.length ? usedProfile : missingProfile).push('exam goals');
  if (track === 'University') (studyFields.some(([, v]) => v?.trim()) ? usedProfile : missingProfile).push('course of study');

  const covered = new Set<string>();
  const recommendations: Recommendation[] = [];
  for (const course of catalogue) {
    const text = `${course.title} ${course.description ?? ''}`;
    const courseExams = examsIn(text);
    courseExams.forEach((e) => covered.add(e));
    if (enrolledIds.has(course.id)) continue;

    const reasons: string[] = [];
    let score = 0;
    const examMatch = goals.filter((g) => courseExams.includes(g));
    if (examMatch.length) {
      score += 4;
      reasons.push(`Matches your exam goal (${examMatch.join(', ')})`);
    }
    if (learnerLevel && normaliseLevel(course.level) === learnerLevel) {
      score += 3;
      reasons.push(`For your ${track === 'University' ? 'level' : 'class'} (${classLabel!.trim()})`);
    }
    if (track && course.track === track) {
      score += 2;
      reasons.push(track === 'Secondary' ? 'For secondary school students like you' : 'For university students like you');
    } else if (track && course.track && course.track !== track && !examMatch.length) {
      continue; // the other education track, with nothing else in common: not relevant
    }
    const courseWords = new Set([...words(course.title), ...words(course.departmentName)]);
    const field = studyFields.find(([, v]) => words(v).some((w) => courseWords.has(w)));
    if (field) {
      score += 2;
      reasons.push(`Related to your ${field[0]} (${field[1]!.trim()})`);
    }
    if (score > 0) recommendations.push({ course, score, reasons });
  }

  recommendations.sort((a, b) => b.score - a.score || a.course.title.localeCompare(b.course.title));
  return {
    recommendations: recommendations.slice(0, limit),
    usedProfile,
    missingProfile,
    uncoveredExamGoals: goals.filter((g) => !covered.has(g)),
    catalogueSize: catalogue.length,
  };
}
