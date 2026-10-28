// src/quizzes/utils/grade-quiz.util.ts

export interface QuizGradeResult {
  totalQuestions: number;
  gradableQuestions: number;
  correctAnswers: number;
  score: number; // percentage 0-100, based on gradable questions only
  graded: boolean; // false when the quiz has no stored answer key to grade against
}

const LETTERS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

function normalize(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim().toLowerCase();
}

function getOptions(question: any): string[] {
  const raw = question?.options ?? question?.choices;
  if (Array.isArray(raw)) return raw.map((o) => String(o));
  if (raw && typeof raw === 'object') return Object.values(raw).map((o) => String(o));
  return [];
}

function getAnswerKey(question: any): unknown {
  return question?.correctAnswer ?? question?.correct_answer ?? question?.answer ?? question?.correct;
}

// Resolves "B" / "b" / "B." / "B) text" to the option text when the question has options,
// so a letter answer and a full-text answer compare equal.
function canonical(value: unknown, options: string[]): string {
  const v = normalize(value);
  if (!v) return '';
  if (options.length) {
    const letterMatch = v.match(/^([a-h])(?:[.)\s:]|$)/);
    if (letterMatch) {
      const idx = LETTERS.indexOf(letterMatch[1]);
      if (idx >= 0 && idx < options.length) return normalize(options[idx]);
    }
  }
  return v;
}

function findSubmittedAnswer(answers: any, question: any, index: number): unknown {
  if (!answers) return undefined;
  if (Array.isArray(answers)) return answers[index];
  const keys = [question?.id, question?.questionId, question?.number, `q${index + 1}`, String(index)];
  for (const key of keys) {
    if (key !== undefined && key !== null && Object.prototype.hasOwnProperty.call(answers, String(key))) {
      return answers[String(key)];
    }
  }
  return undefined;
}

/**
 * Grades submitted answers against the answer key stored on the quiz questions.
 * Questions without an answer key are counted in totalQuestions but excluded from the score.
 */
export function gradeQuiz(questions: any[] | null | undefined, answers: unknown): QuizGradeResult {
  const list = Array.isArray(questions) ? questions : [];
  let gradable = 0;
  let correct = 0;

  list.forEach((question, index) => {
    const key = getAnswerKey(question);
    if (normalize(key) === '') return;
    gradable++;

    const options = getOptions(question);
    const submitted = findSubmittedAnswer(answers, question, index);
    if (canonical(submitted, options) !== '' && canonical(submitted, options) === canonical(key, options)) {
      correct++;
    }
  });

  const score = gradable > 0 ? Math.round((correct / gradable) * 10000) / 100 : 0;
  return {
    totalQuestions: list.length,
    gradableQuestions: gradable,
    correctAnswers: correct,
    score,
    graded: gradable > 0,
  };
}

export interface QuestionReview {
  index: number;
  question: string;
  options: string[];
  /** what the learner answered (as given), or null */
  chosen: string | null;
  /** the correct option text, or null when the question has no answer key */
  answer: string | null;
  correct: boolean;
  gradable: boolean;
  explanation: string;
  topic: string;
}

/** Same rules as gradeQuiz, per question — for stored attempts and their review (only shown after submitting). */
export function reviewQuiz(questions: any[] | null | undefined, answers: unknown): { result: QuizGradeResult; questions: QuestionReview[] } {
  const list = Array.isArray(questions) ? questions : [];
  const out = list.map((question, index): QuestionReview => {
    const options = getOptions(question);
    const key = getAnswerKey(question);
    const gradable = normalize(key) !== '';
    const submitted = findSubmittedAnswer(answers, question, index);
    const chosen = submitted === undefined || submitted === null || String(submitted).trim() === '' ? null : String(submitted);
    const answerText = gradable ? (options.find((o) => normalize(o) === canonical(key, options)) ?? String(key)) : null;
    return {
      index,
      question: String(question?.question ?? question?.text ?? question?.prompt ?? ''),
      options,
      chosen,
      answer: answerText,
      correct: gradable && chosen !== null && canonical(chosen, options) === canonical(key, options),
      gradable,
      explanation: String(question?.explanation ?? ''),
      topic: String(question?.topic ?? question?.subject ?? '').trim(),
    };
  });
  return { result: gradeQuiz(list, answers), questions: out };
}
