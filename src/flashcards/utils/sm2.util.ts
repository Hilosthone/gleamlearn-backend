// src/flashcards/utils/sm2.util.ts
export interface SM2Result {
  interval: number;
  repetitions: number;
  easeFactor: number;
  nextReviewDate: Date;
}

export function calculateSM2(
  quality: number,
  repetitions: number,
  previousEaseFactor: number,
  previousInterval: number,
): SM2Result {
  let grade = Math.max(0, Math.min(5, quality));
  let easeFactor = previousEaseFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  
  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  let interval: number;
  let nextRepetitions: number;

  if (grade >= 3) {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(previousInterval * easeFactor);
    }
    nextRepetitions = repetitions + 1;
  } else {
    nextRepetitions = 0;
    interval = 1;
  }

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  return {
    interval,
    repetitions: nextRepetitions,
    easeFactor: parseFloat(easeFactor.toFixed(2)),
    nextReviewDate,
  };
}