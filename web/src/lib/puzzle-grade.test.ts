import { describe, expect, it } from "vitest";
import { gradeOrderedAnswers } from "./puzzle-grade";

describe("gradeOrderedAnswers", () => {
  it("scores full match as 100", () => {
    expect(
      gradeOrderedAnswers(["a", "b"], ["A", " B "]),
    ).toEqual({ correctCount: 2, score: 100 });
  });

  it("scores partial", () => {
    expect(
      gradeOrderedAnswers(["ONE", "TWO", "THREE"], ["one", "wrong", "three"]),
    ).toEqual({ correctCount: 2, score: 67 });
  });

  it("handles empty correct list", () => {
    expect(gradeOrderedAnswers([], [])).toEqual({ correctCount: 0, score: 0 });
  });
});
