import { assertEquals } from "jsr:@std/assert@1";
import { gradeOrderedAnswers, parseDailyTensPayload } from "./daily-tens.ts";

Deno.test("parseDailyTensPayload accepts v1", () => {
  const p = parseDailyTensPayload({
    type: "daily_tens_v1",
    prompt: "Hi",
    answers: ["a"],
  });
  assertEquals(p?.answers, ["a"]);
});

Deno.test("parseDailyTensPayload rejects bad type", () => {
  assertEquals(parseDailyTensPayload({ type: "x", prompt: "", answers: [] }), null);
});

Deno.test("gradeOrderedAnswers matches web unit tests", () => {
  assertEquals(gradeOrderedAnswers(["a", "b"], ["A", " B "]), {
    correctCount: 2,
    score: 100,
  });
  assertEquals(
    gradeOrderedAnswers(["ONE", "TWO", "THREE"], ["one", "wrong", "three"]),
    { correctCount: 2, score: 67 },
  );
  assertEquals(gradeOrderedAnswers([], []), { correctCount: 0, score: 0 });
});
