import { describe, expect, it } from "vitest";
import { leaderboardSectionInnerHtml } from "./leaderboard-view";

describe("leaderboardSectionInnerHtml", () => {
  it("renders empty state when no data", () => {
    const html = leaderboardSectionInnerHtml(null, []);
    expect(html).toContain("No scores yet");
    expect(html).not.toContain("<ol");
  });

  it("renders error message escaped", () => {
    const html = leaderboardSectionInnerHtml(
      { message: 'fail <img src=x onerror=alert(1)>' },
      null,
    );
    expect(html).toContain("&lt;img");
    expect(html).not.toContain("<img");
  });

  it("escapes display names in list", () => {
    const html = leaderboardSectionInnerHtml(null, [
      { rank: 1, display_name: "<b>evil</b>", score: 10 },
    ]);
    expect(html).toContain("&lt;b&gt;evil&lt;/b&gt;");
    expect(html).not.toContain("<b>evil</b>");
    expect(html).toContain(">10<");
  });

  it("caps at 10 rows", () => {
    const rows = Array.from({ length: 15 }, (_, i) => ({
      rank: i + 1,
      display_name: `u${i}`,
      score: i,
    }));
    const html = leaderboardSectionInnerHtml(null, rows);
    const matches = html.match(/<li>/g);
    expect(matches?.length).toBe(10);
  });
});
