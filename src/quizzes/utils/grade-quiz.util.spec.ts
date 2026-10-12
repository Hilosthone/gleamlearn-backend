import { gradeQuiz } from './grade-quiz.util.js';

describe('gradeQuiz', () => {
  const questions = [
    { id: 'q1', question: '2 + 2?', options: ['3', '4', '5', '6'], correctAnswer: 'B' },
    { id: 'q2', question: 'Capital of France?', choices: ['Paris', 'Rome'], answer: 'Paris' },
    { id: 'q3', question: 'Sky colour?', options: ['Blue', 'Green'], correct_answer: 'Blue' },
  ];

  it('scores letter and full-text answers against the stored key', () => {
    const result = gradeQuiz(questions, { q1: '4', q2: 'paris', q3: 'B' });
    expect(result).toEqual({ totalQuestions: 3, gradableQuestions: 3, correctAnswers: 2, score: 66.67, graded: true });
  });

  it('accepts answers keyed by position (q1, q2...) and as an array', () => {
    const noIds = questions.map(({ id: _id, ...rest }) => rest);
    expect(gradeQuiz(noIds, { q1: 'B', q2: 'Paris', q3: 'Blue' }).correctAnswers).toBe(3);
    expect(gradeQuiz(noIds, ['B', 'Paris', 'Blue']).correctAnswers).toBe(3);
  });

  it('returns graded=false and score 0 when there is no answer key', () => {
    const result = gradeQuiz([{ question: 'Open question' }], { q1: 'anything' });
    expect(result.graded).toBe(false);
    expect(result.score).toBe(0);
  });

  it('handles missing questions and answers without throwing', () => {
    expect(gradeQuiz(undefined, undefined)).toEqual({
      totalQuestions: 0, gradableQuestions: 0, correctAnswers: 0, score: 0, graded: false,
    });
    expect(gradeQuiz(questions, undefined).correctAnswers).toBe(0);
  });
});
