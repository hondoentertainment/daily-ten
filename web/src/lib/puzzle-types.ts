/** Supported puzzle_payload shapes from the API. */
export type DailyTensPayload = {
  type: "daily_tens_v1" | "daily_tens";
  prompt: string;
  answers: string[];
};

export function parseDailyTensPayload(raw: unknown): DailyTensPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.type !== "daily_tens_v1" && o.type !== "daily_tens") return null;
  if (typeof o.prompt !== "string") return null;
  if (!Array.isArray(o.answers)) return null;
  if (!o.answers.every((x) => typeof x === "string")) return null;
  return {
    type: o.type,
    prompt: o.prompt,
    answers: o.answers as string[],
  };
}
