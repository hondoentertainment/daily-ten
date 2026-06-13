import { describe, expect, it } from "vitest";
import { escapeHtml } from "./html";

describe("escapeHtml", () => {
  it("escapes ampersand and angle brackets", () => {
    expect(escapeHtml(`a & b <script>`)).toBe(
      "a &amp; b &lt;script&gt;",
    );
  });

  it("escapes double quotes", () => {
    expect(escapeHtml(`say "hi"`)).toBe("say &quot;hi&quot;");
  });

  it("leaves safe text unchanged", () => {
    expect(escapeHtml("Daily Tens")).toBe("Daily Tens");
  });
});
