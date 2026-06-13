/** Parse `puzzle_payload` for daily tens (must match web `puzzle-types.ts`). */
export function parseDailyTensPayload(
  raw: unknown,
): { type: string; prompt: string; answers: string[] } | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.type !== "daily_tens_v1" && o.type !== "daily_tens") return null;
  if (typeof o.prompt !== "string") return null;
  if (!Array.isArray(o.answers)) return null;
  if (!o.answers.every((x) => typeof x === "string")) return null;
  return {
    type: o.type as string,
    prompt: o.prompt,
    answers: o.answers as string[],
  };
}

function norm(s: string): string {
  return s.trim().toUpperCase();
}

/** Same algorithm as `web/src/lib/puzzle-grade.ts`. */
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
