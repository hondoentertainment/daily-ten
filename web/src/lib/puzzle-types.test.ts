import { describe, expect, it } from "vitest";
import { parseDailyTensPayload } from "./puzzle-types";

describe("parseDailyTensPayload", () => {
  it("accepts daily_tens_v1", () => {
    const p = parseDailyTensPayload({
      type: "daily_tens_v1",
      prompt: "Hi",
      answers: ["a", "b"],
    });
    expect(p).toEqual({ type: "daily_tens_v1", prompt: "Hi", answers: ["a", "b"] });
  });

  it("accepts legacy daily_tens", () => {
    expect(
      parseDailyTensPayload({
        type: "daily_tens",
        prompt: "x",
        answers: ["1"],
      }),
    ).not.toBeNull();
  });

  it("rejects invalid", () => {
    expect(parseDailyTensPayload(null)).toBeNull();
    expect(parseDailyTensPayload({ type: "other" })).toBeNull();
  });
});
