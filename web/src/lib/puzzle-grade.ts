function norm(s: string): string {
  return s.trim().toUpperCase();
}

/**
 * Compare user answers to canonical order. Score is 0–100 by match ratio.
 */
export function gradeOrderedAnswers(
  correct: string[],
  user: string[],
): { correctCount: number; score: number } {
  const len = correct.length;
  if (len === 0) return { correctCount: 0, score: 0 };
  let matches = 0;
  for (let i = 0; i < len; i++) {
    const u = user[i];
    if (u !== undefined && norm(correct[i]!) === norm(u)) matches++;
  }
  const score = Math.round((matches / len) * 100);
  return { correctCount: matches, score };
}
