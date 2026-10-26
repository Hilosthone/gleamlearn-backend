// src/common/assessment/learner-questions.ts

/**
 * Fields that reveal the answer. The grader (quizzes/utils/grade-quiz.util.ts) reads the key from
 * correctAnswer / correct_answer / answer / correct; explanations and solutions give it away too.
 */
const ANSWER_FIELDS = ['correctAnswer', 'correct_answer', 'answer', 'correct', 'explanation', 'solution', 'answerExplanation'];

/** A question as a learner may see it before submitting: everything except the answer key and its explanation. */
export function toLearnerQuestion(question: unknown): unknown {
  if (!question || typeof question !== 'object' || Array.isArray(question)) return question;
  const copy: Record<string, unknown> = { ...(question as Record<string, unknown>) };
  for (const field of ANSWER_FIELDS) delete copy[field];
  return copy;
}

/**
 * Quiz / test / exam as served to learners. Before this, GET /quizzes|tests|exams(/:id) returned the stored
 * questions with their answer keys, so a learner could read the answers before submitting (quiz submissions
 * award XP and coins).
 */
export function toLearnerAssessment<T extends { questions?: unknown }>(assessment: T): T {
  const questions = Array.isArray(assessment.questions) ? assessment.questions.map(toLearnerQuestion) : assessment.questions;
  return { ...assessment, questions };
}
