// Questions are grouped by difficulty tier. Factors are the complete factorization;
// distractors are common sign, coefficient, and incomplete-factorization errors.
const QUESTION_BANK = [
  { id: "s2-common-1", stage: 1, prompt: "Factor completely: 6x + 12", factors: ["6", "x + 2"], distractors: ["2x + 4", "6x + 2", "x + 12"] },
  { id: "s2-common-2", stage: 1, prompt: "Factor completely: 12x² + 8x", factors: ["4x", "3x + 2"], distractors: ["2x", "6x + 4", "4x + 3"] },
  { id: "s2-difference-1", stage: 1, prompt: "Factor completely: x² − 25", factors: ["x − 5", "x + 5"], distractors: ["x − 25", "x + 25", "(x − 5)²"] },
  { id: "s3-quadratic-1", stage: 1, prompt: "Factor completely: x² + 7x + 12", factors: ["x + 3", "x + 4"], distractors: ["x − 3", "x + 12", "x + 2"] },
  { id: "s3-quadratic-2", stage: 1, prompt: "Factor completely: x² − 9x + 20", factors: ["x − 4", "x − 5"], distractors: ["x + 4", "x − 20", "x − 2"] },
  { id: "s3-quadratic-3", stage: 1, prompt: "Factor completely: x² + 2x − 15", factors: ["x + 5", "x − 3"], distractors: ["x − 5", "x + 3", "x − 15"] },
  { id: "s3-quadratic-4", stage: 1, prompt: "Factor completely: x² − 11x + 30", factors: ["x − 5", "x − 6"], distractors: ["x + 5", "x − 30", "x − 3"] },
  { id: "s3-common-3", stage: 1, prompt: "Factor completely: 3x² + 15x", factors: ["3x", "x + 5"], distractors: ["3", "x + 15", "3x + 5"] },

  { id: "s4-quadratic-1", stage: 2, prompt: "Factor completely: x² − 3x − 28", factors: ["x − 7", "x + 4"], distractors: ["x + 7", "x − 4", "x − 28"] },
  { id: "s4-quadratic-2", stage: 2, prompt: "Factor completely: 2x² + 7x + 3", factors: ["2x + 1", "x + 3"], distractors: ["2x + 3", "x + 1", "2x − 1"] },
  { id: "s4-quadratic-3", stage: 2, prompt: "Factor completely: 6x² − x − 2", factors: ["3x − 2", "2x + 1"], distractors: ["3x + 2", "2x − 1", "6x − 2"] },
  { id: "s4-quadratic-4", stage: 2, prompt: "Factor completely: 5x² + 13x + 6", factors: ["5x + 3", "x + 2"], distractors: ["5x + 2", "x + 3", "5x − 3"] },
  { id: "s4-common-1", stage: 2, prompt: "Factor completely: 3x² − 27", factors: ["3", "x − 3", "x + 3"], distractors: ["x − 9", "3x − 9", "x² − 9"] },
  { id: "s4-square-1", stage: 2, prompt: "Factor completely: 4x² − 12x + 9", factors: ["2x − 3", "2x − 3"], distractors: ["2x + 3", "4x − 3", "x − 3"] },
  { id: "s4-quadratic-5", stage: 2, prompt: "Factor completely: 2x² − 5x − 3", factors: ["2x + 1", "x − 3"], distractors: ["2x − 1", "x + 3", "2x − 3"] },
  { id: "s4-quadratic-6", stage: 2, prompt: "Factor completely: 3x² + 10x + 8", factors: ["3x + 4", "x + 2"], distractors: ["3x + 2", "x + 4", "3x − 4"] },

  { id: "s5-quadratic-1", stage: 3, prompt: "Factor completely: 6x² + x − 2", factors: ["3x + 2", "2x − 1"], distractors: ["3x − 2", "2x + 1", "6x − 2"] },
  { id: "s5-quadratic-2", stage: 3, prompt: "Factor completely: 8x² − 2x − 3", factors: ["4x − 3", "2x + 1"], distractors: ["4x + 3", "2x − 1", "8x − 3"] },
  { id: "s5-quadratic-3", stage: 3, prompt: "Factor completely: 6x² − 11x + 3", factors: ["3x − 1", "2x − 3"], distractors: ["3x + 1", "2x + 3", "6x − 3"] },
  { id: "s5-difference-2", stage: 3, prompt: "Factor completely: 9x² − 25y²", factors: ["3x − 5y", "3x + 5y"], distractors: ["3x − 5y", "9x − 25y", "3x + 5"] },
  { id: "s5-cubic-1", stage: 3, prompt: "Factor completely: x³ − 4x", factors: ["x", "x − 2", "x + 2"], distractors: ["x² − 4", "x − 4", "x + 4"] },
  { id: "s5-common-1", stage: 3, prompt: "Factor completely: 2a² − 18", factors: ["2", "a − 3", "a + 3"], distractors: ["a − 9", "2a − 18", "a² − 9"] },
  { id: "s5-square-1", stage: 3, prompt: "Factor completely: x² − 6xy + 9y²", factors: ["x − 3y", "x − 3y"], distractors: ["x + 3y", "x − 9y", "x² − 9y²"] },
  { id: "s6-common-1", stage: 3, prompt: "Factor completely: 3x³ + 6x² − 45x", factors: ["3x", "x + 5", "x − 3"], distractors: ["3x²", "x + 3", "x − 5"] }
];
